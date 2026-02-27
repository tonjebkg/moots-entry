import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { getDb } from '@/lib/db';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';
import { addContactToCampaignSchema } from '@/lib/schemas/invitation';

type RouteParams = { params: Promise<{ eventId: string }> };

/**
 * POST /api/events/[eventId]/add-to-campaign
 *
 * Bridge endpoint: adds a contact from the People Database to an invitation campaign.
 * Called from Guest Intelligence when the host clicks "Add to Wave".
 * Sets the critical contact_id FK on campaign_invitations.
 */
export const POST = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const { eventId } = await params;
  const eventIdNum = parseInt(eventId);

  const result = await validateRequest(request, addContactToCampaignSchema);
  if (!result.success) return result.error;

  const { contact_id, campaign_id, tier, priority, internal_notes } = result.data;
  const db = getDb();

  // Fetch contact (must belong to same workspace)
  const contacts = await db`
    SELECT id, full_name, emails
    FROM people_contacts
    WHERE id = ${contact_id}::uuid AND workspace_id = ${auth.workspace.id}
  `;

  if (contacts.length === 0) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  const contact = contacts[0];

  // Verify campaign belongs to this event
  const campaigns = await db`
    SELECT id, event_id FROM invitation_campaigns
    WHERE id = ${campaign_id}::uuid AND event_id = ${eventIdNum}
  `;

  if (campaigns.length === 0) {
    return NextResponse.json({ error: 'Campaign not found for this event' }, { status: 404 });
  }

  // Extract primary email from contact's emails JSONB
  const emailsArr = Array.isArray(contact.emails) ? contact.emails : [];
  const primaryEmail = emailsArr.find((e: any) => e.primary)?.email
    || emailsArr[0]?.email
    || '';

  if (!primaryEmail) {
    return NextResponse.json({ error: 'Contact has no email address' }, { status: 400 });
  }

  // Dedup: check if contact or email already in this campaign
  const existing = await db`
    SELECT id FROM campaign_invitations
    WHERE campaign_id = ${campaign_id}::uuid
      AND (contact_id = ${contact_id}::uuid OR email = ${primaryEmail})
  `;

  if (existing.length > 0) {
    return NextResponse.json(
      { error: 'Contact already in this campaign', invitation_id: existing[0].id },
      { status: 409 }
    );
  }

  // Create invitation with contact_id linked
  const invitation = await db`
    INSERT INTO campaign_invitations (
      campaign_id, event_id, contact_id, full_name, email,
      tier, priority, internal_notes, status
    ) VALUES (
      ${campaign_id}::uuid, ${eventIdNum}, ${contact_id}::uuid,
      ${contact.full_name}, ${primaryEmail},
      ${tier || 'TIER_2'}::invitation_tier,
      ${priority || 'NORMAL'}::invitation_priority,
      ${internal_notes || null},
      'CONSIDERING'::invitation_status
    )
    RETURNING id, campaign_id, event_id, contact_id, full_name, email, status, tier, priority, created_at
  `;

  // Update campaign denormalized counts
  await db`
    UPDATE invitation_campaigns SET
      total_considering = (
        SELECT COUNT(*) FROM campaign_invitations WHERE campaign_id = ${campaign_id}::uuid AND status = 'CONSIDERING'
      ),
      updated_at = NOW()
    WHERE id = ${campaign_id}::uuid
  `;

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'invitation.created_from_contact',
    entityType: 'campaign_invitation',
    entityId: invitation[0].id,
    newValue: { contact_id, campaign_id, tier, priority },
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json(invitation[0], { status: 201 });
});
