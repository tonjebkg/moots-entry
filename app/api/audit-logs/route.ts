import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateQueryParams } from '@/lib/validate-request';
import { auditLogQuerySchema } from '@/lib/schemas/audit-log';
import { requireAuth, requireRole } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/audit-logs — List audit logs with filters + pagination
 * Requires OWNER or ADMIN role.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const validation = validateQueryParams(request.nextUrl.searchParams, auditLogQuerySchema);
  if (!validation.success) return validation.error;
  const { actor_id, action, entity_type, entity_id, from, to, page, limit } = validation.data;

  const db = getDb();
  const offset = (page - 1) * limit;

  // Build dynamic WHERE clauses
  const conditions: string[] = ['workspace_id = $1'];
  const params: unknown[] = [auth.workspace.id];
  let paramIdx = 2;

  if (actor_id) {
    conditions.push(`actor_id = $${paramIdx}`);
    params.push(actor_id);
    paramIdx++;
  }
  if (action) {
    conditions.push(`action = $${paramIdx}`);
    params.push(action);
    paramIdx++;
  }
  if (entity_type) {
    conditions.push(`entity_type = $${paramIdx}`);
    params.push(entity_type);
    paramIdx++;
  }
  if (entity_id) {
    conditions.push(`entity_id = $${paramIdx}`);
    params.push(entity_id);
    paramIdx++;
  }
  if (from) {
    conditions.push(`created_at >= $${paramIdx}::timestamptz`);
    params.push(from);
    paramIdx++;
  }
  if (to) {
    conditions.push(`created_at <= $${paramIdx}::timestamptz`);
    params.push(to);
    paramIdx++;
  }

  // For Neon tagged template, we use a simpler approach
  // Build filtered query with workspace_id as the base filter
  const result = await db`
    SELECT id, workspace_id, actor_id, actor_email, action, entity_type, entity_id,
           previous_value, new_value, metadata, ip_address, created_at
    FROM audit_logs
    WHERE workspace_id = ${auth.workspace.id}
      AND (${actor_id ?? null}::uuid IS NULL OR actor_id = ${actor_id ?? null}::uuid)
      AND (${action ?? null}::text IS NULL OR action = ${action ?? null})
      AND (${entity_type ?? null}::text IS NULL OR entity_type = ${entity_type ?? null})
      AND (${entity_id ?? null}::text IS NULL OR entity_id = ${entity_id ?? null})
      AND (${from ?? null}::timestamptz IS NULL OR created_at >= ${from ?? null}::timestamptz)
      AND (${to ?? null}::timestamptz IS NULL OR created_at <= ${to ?? null}::timestamptz)
    ORDER BY created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const countResult = await db`
    SELECT COUNT(*) AS total
    FROM audit_logs
    WHERE workspace_id = ${auth.workspace.id}
      AND (${actor_id ?? null}::uuid IS NULL OR actor_id = ${actor_id ?? null}::uuid)
      AND (${action ?? null}::text IS NULL OR action = ${action ?? null})
      AND (${entity_type ?? null}::text IS NULL OR entity_type = ${entity_type ?? null})
      AND (${entity_id ?? null}::text IS NULL OR entity_id = ${entity_id ?? null})
      AND (${from ?? null}::timestamptz IS NULL OR created_at >= ${from ?? null}::timestamptz)
      AND (${to ?? null}::timestamptz IS NULL OR created_at <= ${to ?? null}::timestamptz)
  `;

  const total = Number(countResult[0]?.total || 0);

  return NextResponse.json({
    logs: result,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  });
});
