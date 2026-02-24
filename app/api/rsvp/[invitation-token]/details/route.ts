import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateInvitationToken } from '@/lib/invitation-token';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ 'invitation-token': string }>;
};

/**
 * GET /api/rsvp/[invitation-token]/details
 * Get invitation details for RSVP page (public endpoint)
 *
 * Returns:
 * - event_title: Event name
 * - event_date: Event date
 * - event_location: Event location
 * - recipient_name: Guest name
 * - recipient_email: Guest email
 */
export const GET = withErrorHandling(
  async (_req: Request, { params }: RouteParams) => {
    const { 'invitation-token': invitationToken } = await params;

    if (!invitationToken) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // Validate invitation token
    const invitation = await validateInvitationToken(invitationToken);

    if (!invitation) {
      return NextResponse.json(
        {
          error: 'Invalid or expired invitation',
          message:
            'This invitation link is invalid, has expired, or you have already responded.',
        },
        { status: 404 }
      );
    }

    // Format event date
    const eventDate = invitation.start_date
      ? new Date(invitation.start_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : 'TBD';

    return NextResponse.json({
      invitation: {
        event_title: invitation.event_title,
        event_date: eventDate,
        event_location: invitation.location || 'TBD',
        recipient_name: invitation.full_name,
        recipient_email: invitation.email,
        expected_plus_ones: invitation.expected_plus_ones || 0,
      },
    });
  }
);
