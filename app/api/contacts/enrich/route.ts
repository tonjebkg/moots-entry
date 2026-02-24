import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { getDb } from '@/lib/db';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';
import { triggerEnrichmentSchema } from '@/lib/schemas/scoring';
import { AiSearchProvider, runEnrichmentPipeline } from '@/lib/enrichment';

/**
 * POST /api/contacts/enrich — Trigger batch enrichment, returns job ID
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const result = await validateRequest(request, triggerEnrichmentSchema);
  if (!result.success) return result.error;
  const { contact_ids } = result.data;

  const db = getDb();

  // Verify all contacts belong to workspace
  const contacts = await db`
    SELECT id FROM people_contacts
    WHERE id = ANY(${contact_ids}::uuid[])
      AND workspace_id = ${auth.workspace.id}
  `;

  const validIds = contacts.map((c: any) => c.id);
  if (validIds.length === 0) {
    return NextResponse.json({ error: 'No valid contacts found' }, { status: 400 });
  }

  // Create enrichment job
  const job = await db`
    INSERT INTO enrichment_jobs (
      workspace_id, status, total_contacts, contact_ids
    ) VALUES (
      ${auth.workspace.id},
      'PENDING'::job_status,
      ${validIds.length},
      ${validIds}::uuid[]
    )
    RETURNING id
  `;

  const jobId = job[0].id;

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'enrichment.triggered',
    entityType: 'enrichment_job',
    entityId: jobId,
    metadata: { contact_count: validIds.length },
    ipAddress: getClientIdentifier(request),
  });

  // Run enrichment asynchronously (fire-and-forget)
  const provider = new AiSearchProvider();
  runEnrichmentPipeline(jobId, auth.workspace.id, validIds, provider).catch((error) => {
    console.error('Enrichment pipeline error:', error);
  });

  return NextResponse.json({
    job_id: jobId,
    total_contacts: validIds.length,
    message: `Enrichment started for ${validIds.length} contacts`,
  }, { status: 202 });
});
