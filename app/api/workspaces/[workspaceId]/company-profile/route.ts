import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateRequest } from '@/lib/validate-request';
import { updateCompanyProfileSchema, researchCompanySchema } from '@/lib/schemas/company-profile';
import { requireAuth, requireRole } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { getClientIdentifier } from '@/lib/rate-limit';
import { researchCompany } from '@/lib/company/research';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ workspaceId: string }> };

/**
 * GET /api/workspaces/[workspaceId]/company-profile
 * Returns company profile fields from workspace row.
 */
export const GET = withErrorHandling(async (_request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth();
  const { workspaceId } = await context.params;

  if (workspaceId !== auth.workspace.id) {
    throw new ForbiddenError('Can only access your active workspace');
  }

  const db = getDb();
  const result = await db`
    SELECT
      name,
      company_website,
      company_description,
      industry,
      market_position,
      key_leadership,
      strategic_priorities,
      competitors,
      brand_voice,
      company_enriched_at
    FROM workspaces
    WHERE id = ${workspaceId}
    LIMIT 1
  `;

  if (result.length === 0) {
    throw new NotFoundError('Workspace');
  }

  const ws = result[0];

  return NextResponse.json({
    company_name: ws.name,
    company_website: ws.company_website,
    company_description: ws.company_description,
    industry: ws.industry,
    market_position: ws.market_position,
    key_leadership: ws.key_leadership || [],
    strategic_priorities: ws.strategic_priorities || [],
    competitors: ws.competitors || [],
    brand_voice: ws.brand_voice,
    company_enriched_at: ws.company_enriched_at,
  });
});

/**
 * PATCH /api/workspaces/[workspaceId]/company-profile
 * Updates company profile fields. Requires OWNER or ADMIN.
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const { workspaceId } = await context.params;
  if (workspaceId !== auth.workspace.id) {
    throw new ForbiddenError('Can only update your active workspace');
  }

  const validation = await validateRequest(request, updateCompanyProfileSchema);
  if (!validation.success) return validation.error;
  const updates = validation.data;

  const db = getDb();

  // Fetch current for audit
  const current = await db`
    SELECT company_website, company_description, industry, market_position,
           key_leadership, strategic_priorities, competitors, brand_voice
    FROM workspaces WHERE id = ${workspaceId} LIMIT 1
  `;
  if (current.length === 0) {
    throw new NotFoundError('Workspace');
  }

  // Apply updates individually (same pattern as workspace PATCH)
  if (updates.company_website !== undefined) {
    await db`UPDATE workspaces SET company_website = ${updates.company_website} WHERE id = ${workspaceId}`;
  }
  if (updates.company_description !== undefined) {
    await db`UPDATE workspaces SET company_description = ${updates.company_description} WHERE id = ${workspaceId}`;
  }
  if (updates.industry !== undefined) {
    await db`UPDATE workspaces SET industry = ${updates.industry} WHERE id = ${workspaceId}`;
  }
  if (updates.market_position !== undefined) {
    await db`UPDATE workspaces SET market_position = ${updates.market_position} WHERE id = ${workspaceId}`;
  }
  if (updates.key_leadership !== undefined) {
    const json = JSON.stringify(updates.key_leadership || []);
    await db`UPDATE workspaces SET key_leadership = ${json}::jsonb WHERE id = ${workspaceId}`;
  }
  if (updates.strategic_priorities !== undefined) {
    const json = JSON.stringify(updates.strategic_priorities || []);
    await db`UPDATE workspaces SET strategic_priorities = ${json}::jsonb WHERE id = ${workspaceId}`;
  }
  if (updates.competitors !== undefined) {
    const json = JSON.stringify(updates.competitors || []);
    await db`UPDATE workspaces SET competitors = ${json}::jsonb WHERE id = ${workspaceId}`;
  }
  if (updates.brand_voice !== undefined) {
    await db`UPDATE workspaces SET brand_voice = ${updates.brand_voice} WHERE id = ${workspaceId}`;
  }

  logAction({
    workspaceId,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'company_profile.updated',
    entityType: 'workspace',
    entityId: workspaceId,
    previousValue: current[0],
    newValue: updates,
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json({ success: true, message: 'Company profile updated' });
});

/**
 * POST /api/workspaces/[workspaceId]/company-profile
 * Action: research — triggers AI company research. Returns immediately.
 */
export const POST = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const { workspaceId } = await context.params;
  if (workspaceId !== auth.workspace.id) {
    throw new ForbiddenError('Can only research your active workspace');
  }

  const validation = await validateRequest(request, researchCompanySchema);
  if (!validation.success) return validation.error;
  const { company_name, company_website } = validation.data;

  // Fire-and-forget: start research async, return immediately
  researchCompany(workspaceId, company_name, company_website).catch((err) => {
    console.error('[Company Research] Failed:', err);
  });

  logAction({
    workspaceId,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'company_profile.research_started',
    entityType: 'workspace',
    entityId: workspaceId,
    newValue: { company_name, company_website },
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json({
    success: true,
    message: 'Company research started. Results will populate shortly.',
  });
});
