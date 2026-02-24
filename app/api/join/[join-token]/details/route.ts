import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateJoinToken } from '@/lib/invitation-token';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ 'join-token': string }>;
};

/**
 * GET /api/join/[join-token]/details
 * Get join invitation details for join page (public endpoint)
 *
 * Returns:
 * - event_title: Event name
 * - recipient_name: Guest name
 * - recipient_email: Guest email (pre-filled)
 */
export const GET = withErrorHandling(
  async (_req: Request, { params }: RouteParams) => {
    const { 'join-token': joinToken } = await params;

    if (!joinToken) {
      return NextResponse.json(
        { error: 'Join token is required' },
        { status: 400 }
      );
    }

    // Validate join token
    const invitation = await validateJoinToken(joinToken);

    if (!invitation) {
      return NextResponse.json(
        {
          error: 'Invalid or expired join link',
          message:
            'This join link is invalid, has expired, or you have already joined.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      invitation: {
        event_title: invitation.event_title,
        recipient_name: invitation.full_name,
        recipient_email: invitation.email,
      },
    });
  }
);
