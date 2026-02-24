import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { validateQueryParams } from '@/lib/validate-request';
import { getDb } from '@/lib/db';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';
import { createContactSchema, contactSearchSchema } from '@/lib/schemas/contact';
import { computeDedupKey } from '@/lib/contacts/dedup';

/**
 * GET /api/contacts — List contacts with search, filter, pagination
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const searchParams = request.nextUrl.searchParams;
  const params = validateQueryParams(searchParams, contactSearchSchema);
  if (!params.success) return params.error;

  const { q, tags, enrichment_status, source, page, limit, sort, order } = params.data;
  const offset = (page - 1) * limit;
  const db = getDb();

  // Build dynamic query with conditions
  const conditions: string[] = [`c.workspace_id = '${auth.workspace.id}'`];
  const queryParts: string[] = [];

  if (q) {
    // Use full-text search for query
    conditions.push(
      `to_tsvector('english', COALESCE(c.full_name, '') || ' ' || COALESCE(c.company, '') || ' ' || COALESCE(c.title, '')) @@ plainto_tsquery('english', '${q.replace(/'/g, "''")}')`
    );
  }

  if (tags) {
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tagList.length > 0) {
      conditions.push(`c.tags && ARRAY[${tagList.map(t => `'${t.replace(/'/g, "''")}'`).join(',')}]::text[]`);
    }
  }

  if (enrichment_status) {
    conditions.push(`c.enrichment_status = '${enrichment_status}'`);
  }

  if (source) {
    conditions.push(`c.source = '${source}'`);
  }

  // Use parameterized queries for safety — build with tagged template
  // For complex dynamic queries, we'll use a simpler approach
  const whereClause = conditions.join(' AND ');
  const orderClause = `c.${sort} ${order}`;

  const countResult = await db`
    SELECT COUNT(*) as total
    FROM people_contacts c
    WHERE workspace_id = ${auth.workspace.id}
      ${q ? db`AND to_tsvector('english', COALESCE(full_name, '') || ' ' || COALESCE(company, '') || ' ' || COALESCE(title, '')) @@ plainto_tsquery('english', ${q})` : db``}
      ${enrichment_status ? db`AND enrichment_status = ${enrichment_status}::enrichment_status` : db``}
      ${source ? db`AND source = ${source}::contact_source` : db``}
      ${tags ? db`AND tags && ${tags.split(',').map(t => t.trim()).filter(Boolean)}::text[]` : db``}
  `;

  const contacts = await db`
    SELECT
      c.id, c.full_name, c.first_name, c.last_name, c.photo_url,
      c.company, c.title, c.emails, c.tags,
      c.enrichment_status, c.source, c.created_at, c.updated_at
    FROM people_contacts c
    WHERE c.workspace_id = ${auth.workspace.id}
      ${q ? db`AND to_tsvector('english', COALESCE(c.full_name, '') || ' ' || COALESCE(c.company, '') || ' ' || COALESCE(c.title, '')) @@ plainto_tsquery('english', ${q})` : db``}
      ${enrichment_status ? db`AND c.enrichment_status = ${enrichment_status}::enrichment_status` : db``}
      ${source ? db`AND c.source = ${source}::contact_source` : db``}
      ${tags ? db`AND c.tags && ${tags.split(',').map(t => t.trim()).filter(Boolean)}::text[]` : db``}
    ORDER BY
      ${sort === 'full_name' ? db`c.full_name` : sort === 'company' ? db`c.company` : sort === 'updated_at' ? db`c.updated_at` : db`c.created_at`}
      ${order === 'asc' ? db`ASC` : db`DESC`}
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return NextResponse.json({
    contacts,
    pagination: {
      page,
      limit,
      total: parseInt(countResult[0].total),
      total_pages: Math.ceil(parseInt(countResult[0].total) / limit),
    },
  });
});

/**
 * POST /api/contacts — Create a new contact with dedup check
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const result = await validateRequest(request, createContactSchema);
  if (!result.success) return result.error;
  const { data } = result;

  const db = getDb();

  // Compute dedup key
  const dedupKey = computeDedupKey(data.full_name, data.emails);

  // Check for duplicates
  if (dedupKey) {
    const existing = await db`
      SELECT id, full_name FROM people_contacts
      WHERE workspace_id = ${auth.workspace.id} AND dedup_key = ${dedupKey}
      LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: 'Duplicate contact found',
          duplicate: { id: existing[0].id, full_name: existing[0].full_name },
        },
        { status: 409 }
      );
    }
  }

  const emailsJson = JSON.stringify(data.emails);
  const phonesJson = JSON.stringify(data.phones);
  const boardJson = JSON.stringify(data.board_affiliations);

  const contact = await db`
    INSERT INTO people_contacts (
      workspace_id, full_name, first_name, last_name, photo_url,
      emails, phones, company, title, role_seniority, industry,
      linkedin_url, twitter_url, net_worth_range, board_affiliations,
      tags, internal_notes, source, source_detail, dedup_key
    ) VALUES (
      ${auth.workspace.id},
      ${data.full_name},
      ${data.first_name || null},
      ${data.last_name || null},
      ${data.photo_url || null},
      ${emailsJson}::jsonb,
      ${phonesJson}::jsonb,
      ${data.company || null},
      ${data.title || null},
      ${data.role_seniority || null},
      ${data.industry || null},
      ${data.linkedin_url || null},
      ${data.twitter_url || null},
      ${data.net_worth_range || null},
      ${boardJson}::jsonb,
      ${data.tags},
      ${data.internal_notes || null},
      ${data.source}::contact_source,
      ${data.source_detail || null},
      ${dedupKey}
    )
    RETURNING *
  `;

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'contact.created',
    entityType: 'contact',
    entityId: contact[0].id,
    newValue: { full_name: data.full_name, company: data.company },
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json(contact[0], { status: 201 });
});
