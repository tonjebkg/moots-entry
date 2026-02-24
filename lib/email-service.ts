import { Resend } from 'resend';
import { env, isDashboardMode } from './env';
import { logger } from './logger';

// Initialize Resend client
// Only available in dashboard mode
const resend = isDashboardMode()
  ? new Resend((env as any).RESEND_API_KEY)
  : null;

// Email sending interfaces
export interface SendRsvpEmailParams {
  to: string;
  recipientName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  rsvpUrl: string;
  subject?: string;
  customBody?: string;
}

export interface SendJoinLinkEmailParams {
  to: string;
  recipientName: string;
  eventTitle: string;
  joinUrl: string;
  subject?: string;
  customBody?: string;
}

export interface EmailResult {
  success: boolean;
  emailServiceId?: string;
  error?: string;
}

/**
 * Send RSVP invitation email (Step 1: Attendance Confirmation)
 * This email asks guests to confirm their attendance.
 * Does NOT grant app access yet.
 */
export async function sendRsvpInvitationEmail(
  params: SendRsvpEmailParams
): Promise<EmailResult> {
  try {
    if (!resend) {
      return {
        success: false,
        error: 'Email service not available (not in dashboard mode)',
      };
    }

    const subject = params.subject || `You're invited to ${params.eventTitle}`;
    const html = params.customBody || generateRsvpEmailBody(params);

    logger.info('Sending RSVP invitation email', {
      to: params.to,
      eventTitle: params.eventTitle,
    });

    const result = await resend.emails.send({
      from: (env as any).RESEND_FROM_EMAIL,
      to: params.to,
      subject,
      html,
      tags: [{ name: 'category', value: 'rsvp_invitation' }],
    });

    if (result.error) {
      logger.error('Failed to send RSVP email', undefined, {
        error: result.error,
        to: params.to,
      });
      return {
        success: false,
        error: result.error.message,
      };
    }

    logger.info('RSVP invitation email sent successfully', {
      to: params.to,
      emailServiceId: result.data?.id,
    });

    return {
      success: true,
      emailServiceId: result.data?.id,
    };
  } catch (error) {
    logger.error('Exception sending RSVP email', undefined, {
      error,
      to: params.to,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send join link email (Step 2: App Access)
 * This email provides access to the Moots event room.
 * Only sent to guests who have accepted their RSVP.
 */
export async function sendJoinLinkEmail(
  params: SendJoinLinkEmailParams
): Promise<EmailResult> {
  try {
    if (!resend) {
      return {
        success: false,
        error: 'Email service not available (not in dashboard mode)',
      };
    }

    const subject = params.subject || `Join the ${params.eventTitle} event room`;
    const html = params.customBody || generateJoinLinkEmailBody(params);

    logger.info('Sending join link email', {
      to: params.to,
      eventTitle: params.eventTitle,
    });

    const result = await resend.emails.send({
      from: (env as any).RESEND_FROM_EMAIL,
      to: params.to,
      subject,
      html,
      tags: [{ name: 'category', value: 'join_link' }],
    });

    if (result.error) {
      logger.error('Failed to send join link email', undefined, {
        error: result.error,
        to: params.to,
      });
      return {
        success: false,
        error: result.error.message,
      };
    }

    logger.info('Join link email sent successfully', {
      to: params.to,
      emailServiceId: result.data?.id,
    });

    return {
      success: true,
      emailServiceId: result.data?.id,
    };
  } catch (error) {
    logger.error('Exception sending join link email', undefined, {
      error,
      to: params.to,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ─── Walk-in Welcome Email ─────────────────────────────────────────────

export interface SendWalkInWelcomeEmailParams {
  to: string;
  recipientName: string;
  eventTitle: string;
}

export async function sendWalkInWelcomeEmail(
  params: SendWalkInWelcomeEmailParams
): Promise<EmailResult> {
  try {
    if (!resend) {
      return { success: false, error: 'Email service not available' };
    }

    const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f9fafb;">
<table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td align="center" style="padding:40px 0;">
<table role="presentation" style="width:600px;max-width:100%;background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,.1);">
<tr><td style="padding:40px;text-align:center;border-bottom:1px solid #e5e7eb;">
  <h1 style="margin:0;font-size:24px;color:#111827;">Welcome to ${params.eventTitle}!</h1>
</td></tr>
<tr><td style="padding:32px 40px;">
  <p style="font-size:16px;color:#374151;line-height:1.6;">Hi ${params.recipientName},</p>
  <p style="font-size:16px;color:#374151;line-height:1.6;">Thank you for joining us! We're glad you could make it.</p>
</td></tr>
<tr><td style="padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;background:#f9fafb;border-radius:0 0 8px 8px;">
  <p style="margin:0;font-size:14px;color:#6b7280;">Powered by <strong>Moots</strong></p>
</td></tr>
</table></td></tr></table></body></html>`.trim();

    const result = await resend.emails.send({
      from: (env as any).RESEND_FROM_EMAIL,
      to: params.to,
      subject: `Welcome to ${params.eventTitle}!`,
      html,
      tags: [{ name: 'category', value: 'walk_in_welcome' }],
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true, emailServiceId: result.data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ─── RSVP Confirmation Email ──────────────────────────────────────────

export interface SendRsvpConfirmationEmailParams {
  to: string;
  recipientName: string;
  eventTitle: string;
  eventDate?: string;
  eventLocation?: string;
}

export async function sendRsvpConfirmationEmail(
  params: SendRsvpConfirmationEmailParams
): Promise<EmailResult> {
  try {
    if (!resend) {
      return { success: false, error: 'Email service not available' };
    }

    const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f9fafb;">
<table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td align="center" style="padding:40px 0;">
<table role="presentation" style="width:600px;max-width:100%;background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,.1);">
<tr><td style="padding:40px;text-align:center;border-bottom:1px solid #e5e7eb;">
  <h1 style="margin:0;font-size:24px;color:#111827;">RSVP Confirmed!</h1>
</td></tr>
<tr><td style="padding:32px 40px;">
  <p style="font-size:16px;color:#374151;line-height:1.6;">Hi ${params.recipientName},</p>
  <p style="font-size:16px;color:#374151;line-height:1.6;">Your RSVP for <strong>${params.eventTitle}</strong> has been received. We'll be in touch with more details soon.</p>
  ${params.eventDate ? `<p style="font-size:14px;color:#6b7280;">Date: ${params.eventDate}</p>` : ''}
  ${params.eventLocation ? `<p style="font-size:14px;color:#6b7280;">Location: ${params.eventLocation}</p>` : ''}
</td></tr>
<tr><td style="padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;background:#f9fafb;border-radius:0 0 8px 8px;">
  <p style="margin:0;font-size:14px;color:#6b7280;">Powered by <strong>Moots</strong></p>
</td></tr>
</table></td></tr></table></body></html>`.trim();

    const result = await resend.emails.send({
      from: (env as any).RESEND_FROM_EMAIL,
      to: params.to,
      subject: `RSVP Confirmed — ${params.eventTitle}`,
      html,
      tags: [{ name: 'category', value: 'rsvp_confirmation' }],
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true, emailServiceId: result.data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ─── Broadcast Email ──────────────────────────────────────────────────

export interface SendBroadcastEmailParams {
  to: string;
  recipientName: string;
  subject: string;
  content: string;
  eventTitle: string;
}

export async function sendBroadcastEmail(
  params: SendBroadcastEmailParams
): Promise<EmailResult> {
  try {
    if (!resend) {
      return { success: false, error: 'Email service not available' };
    }

    const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f9fafb;">
<table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td align="center" style="padding:40px 0;">
<table role="presentation" style="width:600px;max-width:100%;background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,.1);">
<tr><td style="padding:40px;text-align:center;border-bottom:1px solid #e5e7eb;">
  <h1 style="margin:0;font-size:24px;color:#111827;">${params.eventTitle}</h1>
</td></tr>
<tr><td style="padding:32px 40px;">
  <p style="font-size:16px;color:#374151;line-height:1.6;">Hi ${params.recipientName},</p>
  <div style="font-size:16px;color:#374151;line-height:1.6;">${params.content}</div>
</td></tr>
<tr><td style="padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;background:#f9fafb;border-radius:0 0 8px 8px;">
  <p style="margin:0;font-size:14px;color:#6b7280;">Powered by <strong>Moots</strong></p>
</td></tr>
</table></td></tr></table></body></html>`.trim();

    const result = await resend.emails.send({
      from: (env as any).RESEND_FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html,
      tags: [{ name: 'category', value: 'broadcast' }],
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true, emailServiceId: result.data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ─── Follow-Up Email ──────────────────────────────────────────────────

export interface SendFollowUpEmailParams {
  to: string;
  recipientName: string;
  subject: string;
  content: string;
  eventTitle: string;
}

export async function sendFollowUpEmail(
  params: SendFollowUpEmailParams
): Promise<EmailResult> {
  try {
    if (!resend) {
      return { success: false, error: 'Email service not available' };
    }

    const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f9fafb;">
<table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td align="center" style="padding:40px 0;">
<table role="presentation" style="width:600px;max-width:100%;background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,.1);">
<tr><td style="padding:40px;text-align:center;border-bottom:1px solid #e5e7eb;">
  <h1 style="margin:0;font-size:24px;color:#111827;">Following up — ${params.eventTitle}</h1>
</td></tr>
<tr><td style="padding:32px 40px;">
  <p style="font-size:16px;color:#374151;line-height:1.6;">Hi ${params.recipientName},</p>
  <div style="font-size:16px;color:#374151;line-height:1.6;">${params.content}</div>
</td></tr>
<tr><td style="padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;background:#f9fafb;border-radius:0 0 8px 8px;">
  <p style="margin:0;font-size:14px;color:#6b7280;">Powered by <strong>Moots</strong></p>
</td></tr>
</table></td></tr></table></body></html>`.trim();

    const result = await resend.emails.send({
      from: (env as any).RESEND_FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html,
      tags: [{ name: 'category', value: 'follow_up' }],
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true, emailServiceId: result.data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Generate HTML body for RSVP invitation email
 */
function generateRsvpEmailBody(params: SendRsvpEmailParams): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're Invited</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 32px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #111827;">You're Invited!</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 40px;">
                            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
                                Hi ${params.recipientName},
                            </p>

                            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
                                You're invited to <strong style="color: #111827;">${params.eventTitle}</strong>
                            </p>

                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                                <tr>
                                    <td style="padding: 16px; background-color: #f9fafb; border-radius: 6px;">
                                        <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Date</p>
                                        <p style="margin: 0; font-size: 16px; color: #111827;">${params.eventDate}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 16px; background-color: #f9fafb; border-radius: 6px; margin-top: 12px;">
                                        <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Location</p>
                                        <p style="margin: 0; font-size: 16px; color: #111827;">${params.eventLocation}</p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 24px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                                Please let us know if you can make it:
                            </p>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 16px 0;">
                                        <a href="${params.rsvpUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; text-align: center;">
                                            RSVP Now
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
                            <p style="margin: 0; font-size: 14px; color: #6b7280;">
                                Powered by <strong style="color: #111827;">Moots</strong>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML body for join link email
 */
function generateJoinLinkEmailBody(params: SendJoinLinkEmailParams): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Join the Event Room</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 32px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #111827;">Join the Event Room</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 40px;">
                            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
                                Hi ${params.recipientName},
                            </p>

                            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
                                You're confirmed for <strong style="color: #111827;">${params.eventTitle}</strong>!
                            </p>

                            <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">
                                Click below to join the event room, where you can:
                            </p>

                            <ul style="margin: 0 0 24px; padding-left: 24px; font-size: 16px; line-height: 1.8; color: #374151;">
                                <li>See other attendees</li>
                                <li>Share your goals and interests</li>
                                <li>Prepare for meaningful introductions</li>
                            </ul>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 16px 0;">
                                        <a href="${params.joinUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; text-align: center;">
                                            Join Event Room
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
                            <p style="margin: 0; font-size: 14px; color: #6b7280;">
                                Powered by <strong style="color: #111827;">Moots</strong>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim();
}
