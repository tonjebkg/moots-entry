import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateQueryParams } from '@/lib/validate-request';
import { auditLogQuerySchema } from '@/lib/schemas/audit-log';
import { requireAuth, requireRole } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/audit-logs/export — Export audit logs as CSV
 * Requires OWNER or ADMIN role.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  // Use same filters, but ignore pagination (export all matching)
  const validation = validateQueryParams(request.nextUrl.searchParams, auditLogQuerySchema);
  if (!validation.success) return validation.error;
  const { actor_id, action, entity_type, entity_id, from, to } = validation.data;

  const db = getDb();

  const result = await db`
    SELECT id, actor_email, action, entity_type, entity_id,
           ip_address, created_at
    FROM audit_logs
    WHERE workspace_id = ${auth.workspace.id}
      AND (${actor_id ?? null}::uuid IS NULL OR actor_id = ${actor_id ?? null}::uuid)
      AND (${action ?? null}::text IS NULL OR action = ${action ?? null})
      AND (${entity_type ?? null}::text IS NULL OR entity_type = ${entity_type ?? null})
      AND (${entity_id ?? null}::text IS NULL OR entity_id = ${entity_id ?? null})
      AND (${from ?? null}::timestamptz IS NULL OR created_at >= ${from ?? null}::timestamptz)
      AND (${to ?? null}::timestamptz IS NULL OR created_at <= ${to ?? null}::timestamptz)
    ORDER BY created_at DESC
    LIMIT 10000
  `;

  // Build CSV
  const headers = ['ID', 'Actor', 'Action', 'Entity Type', 'Entity ID', 'IP', 'Timestamp'];
  const rows = result.map((row: Record<string, unknown>) => [
    row.id,
    row.actor_email || 'system',
    row.action,
    row.entity_type,
    row.entity_id || '',
    row.ip_address || '',
    row.created_at,
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  const csv = [headers.join(','), ...rows].join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
});
