import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { tryAuthOrEventFallback } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ eventId: string }>;
};

/**
 * Build parameterized WHERE clauses for both audit_logs and agent_activity_log,
 * using $N placeholders and collecting param values.
 */
function buildFilters(
  eventIdNum: number,
  actorId: string | null,
  actionType: string | null,
  from: string | null,
  to: string | null,
  search: string | null,
) {
  const eventIdStr = String(eventIdNum);
  const params: any[] = [];
  let idx = 0;

  function p(value: any): string {
    idx++;
    params.push(value);
    return `$${idx}`;
  }

  // Audit logs conditions
  const auditConds: string[] = [];
  const pEvStr1 = p(eventIdStr);
  const pEvStr2 = p(eventIdStr);
  auditConds.push(`(al.metadata->>'event_id' = ${pEvStr1} OR (al.entity_id = ${pEvStr2} AND al.entity_type = 'event'))`);

  // Agent activity conditions
  const agentConds: string[] = [];
  const pEvNum = p(eventIdNum);
  agentConds.push(`aal.event_id = ${pEvNum}`);

  if (actorId) {
    const pa = p(actorId);
    auditConds.push(`al.actor_id = ${pa}::uuid`);
    agentConds.push('FALSE');
  }

  if (actionType) {
    const pa1 = p(`${actionType}.%`);
    auditConds.push(`al.action LIKE ${pa1}`);
    const pa2 = p(`${actionType.replace('ai.', '')}%`);
    agentConds.push(`aal.activity_type LIKE ${pa2}`);
  }

  if (from) {
    const pf1 = p(from);
    const pf2 = p(from);
    auditConds.push(`al.created_at >= ${pf1}::timestamptz`);
    agentConds.push(`aal.created_at >= ${pf2}::timestamptz`);
  }

  if (to) {
    const pt1 = p(to);
    const pt2 = p(to);
    auditConds.push(`al.created_at <= ${pt1}::timestamptz`);
    agentConds.push(`aal.created_at <= ${pt2}::timestamptz`);
  }

  if (search) {
    const pattern = `%${search}%`;
    const s1 = p(pattern);
    const s2 = p(pattern);
    const s3 = p(pattern);
    const s4 = p(pattern);
    auditConds.push(`(al.action ILIKE ${s1} OR al.entity_type ILIKE ${s2} OR al.metadata::text ILIKE ${s3} OR al.new_value::text ILIKE ${s4})`);
    const s5 = p(pattern);
    const s6 = p(pattern);
    const s7 = p(pattern);
    agentConds.push(`(aal.activity_type ILIKE ${s5} OR aal.headline ILIKE ${s6} OR aal.detail ILIKE ${s7})`);
  }

  return {
    auditWhere: auditConds.join(' AND '),
    agentWhere: agentConds.join(' AND '),
    params,
    nextParamIdx: idx,
  };
}

/**
 * GET /api/events/[eventId]/activity-log
 * Returns activity log entries for a specific event, combining audit_logs and agent_activity_log.
 */
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { eventId } = await params;
  const eventIdNum = parseInt(eventId, 10);

  if (isNaN(eventIdNum)) {
    return NextResponse.json({ error: 'Valid eventId is required' }, { status: 400 });
  }

  const auth = await tryAuthOrEventFallback(eventIdNum);

  const db = getDb();
  const url = new URL(request.url);

  const actorId = url.searchParams.get('actor_id') || null;
  const actionType = url.searchParams.get('action_type') || null;
  const from = url.searchParams.get('from') || null;
  const to = url.searchParams.get('to') || null;
  const search = url.searchParams.get('search') || null;
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
  const offset = (page - 1) * limit;

  // ── Count query ──
  const countFilters = buildFilters(eventIdNum, actorId, actionType, from, to, search);

  const countQuery = `
    SELECT COUNT(*) AS total FROM (
      SELECT al.id
      FROM audit_logs al
      WHERE ${countFilters.auditWhere}
      UNION ALL
      SELECT aal.id
      FROM agent_activity_log aal
      WHERE ${countFilters.agentWhere}
    ) combined
  `;

  // Neon driver supports parameterized queries at runtime; type assertion needed
  const dbQuery = db as unknown as (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]>;
  const countResult = await dbQuery(countQuery, countFilters.params);
  const total = parseInt(String(countResult[0]?.total ?? '0'), 10);
  const totalPages = Math.ceil(total / limit);

  // ── Entries query (recompute filters for fresh param indices) ──
  const entryFilters = buildFilters(eventIdNum, actorId, actionType, from, to, search);
  const limitIdx = entryFilters.nextParamIdx + 1;
  const offsetIdx = entryFilters.nextParamIdx + 2;
  const entryParams = [...entryFilters.params, limit, offset];

  const entriesQuery = `
    SELECT
      al.id,
      al.actor_id,
      al.actor_email,
      al.action,
      al.entity_type,
      al.entity_id,
      al.new_value,
      al.metadata,
      al.created_at,
      u.full_name AS actor_name,
      u.avatar_url AS actor_avatar
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.actor_id
    WHERE ${entryFilters.auditWhere}

    UNION ALL

    SELECT
      aal.id,
      NULL::uuid AS actor_id,
      'system' AS actor_email,
      'ai.' || aal.activity_type AS action,
      'agent_activity' AS entity_type,
      aal.event_id::text AS entity_id,
      jsonb_build_object('headline', aal.headline, 'detail', aal.detail) AS new_value,
      aal.metadata,
      aal.created_at,
      'Moots Intelligence' AS actor_name,
      NULL AS actor_avatar
    FROM agent_activity_log aal
    WHERE ${entryFilters.agentWhere}

    ORDER BY created_at DESC
    LIMIT $${limitIdx}
    OFFSET $${offsetIdx}
  `;

  const entries = await dbQuery(entriesQuery, entryParams);

  // ── Actors for filter dropdown (simple tagged template query) ──
  const eventIdStr = String(eventIdNum);
  const actorsResult = await db`
    SELECT DISTINCT al.actor_id AS id, u.full_name AS name, u.avatar_url
    FROM audit_logs al
    JOIN users u ON u.id = al.actor_id
    WHERE (al.metadata->>'event_id' = ${eventIdStr}
       OR (al.entity_id = ${eventIdStr} AND al.entity_type = 'event'))
      AND al.actor_id IS NOT NULL
    ORDER BY u.full_name
  `;

  return NextResponse.json({
    entries: entries.map((e: any) => ({
      id: e.id,
      actor_id: e.actor_id,
      actor_email: e.actor_email,
      actor_name: e.actor_name || e.actor_email || 'System',
      actor_avatar: e.actor_avatar,
      action: e.action,
      entity_type: e.entity_type,
      entity_id: e.entity_id,
      new_value: e.new_value,
      metadata: e.metadata,
      created_at: e.created_at,
    })),
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
    },
    actors: actorsResult.map((a: any) => ({
      id: a.id,
      name: a.name,
      avatar_url: a.avatar_url,
    })),
  });
});
