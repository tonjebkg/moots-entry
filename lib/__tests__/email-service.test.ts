import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env module before importing email-service
vi.mock('@/lib/env', () => ({
  env: {
    RESEND_API_KEY: 're_test_key',
    RESEND_FROM_EMAIL: 'test@moots.com',
  },
  isDashboardMode: () => true,
}));

describe('email-service', () => {
  let sendRsvpInvitationEmail: any;
  let sendJoinLinkEmail: any;
  let sendWalkInWelcomeEmail: any;
  let sendBroadcastEmail: any;
  let sendFollowUpEmail: any;
  let sendMagicLinkEmail: any;
  let sendPasswordResetEmail: any;
  let sendWorkspaceInviteEmail: any;
  let sendCrmSyncNotificationEmail: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../email-service');
    sendRsvpInvitationEmail = mod.sendRsvpInvitationEmail;
    sendJoinLinkEmail = mod.sendJoinLinkEmail;
    sendWalkInWelcomeEmail = mod.sendWalkInWelcomeEmail;
    sendBroadcastEmail = mod.sendBroadcastEmail;
    sendFollowUpEmail = mod.sendFollowUpEmail;
    sendMagicLinkEmail = mod.sendMagicLinkEmail;
    sendPasswordResetEmail = mod.sendPasswordResetEmail;
    sendWorkspaceInviteEmail = mod.sendWorkspaceInviteEmail;
    sendCrmSyncNotificationEmail = mod.sendCrmSyncNotificationEmail;
  });

  it('sends RSVP invitation email successfully', async () => {
    const result = await sendRsvpInvitationEmail({
      to: 'guest@test.com',
      recipientName: 'Test Guest',
      eventTitle: 'Demo Event',
      eventDate: '2025-01-15',
      eventLocation: 'NYC',
      rsvpUrl: 'https://app.moots.com/rsvp/abc123',
    });

    expect(result.success).toBe(true);
    expect(result.emailServiceId).toBe('test-email-id');
  });

  it('sends join link email successfully', async () => {
    const result = await sendJoinLinkEmail({
      to: 'guest@test.com',
      recipientName: 'Test Guest',
      eventTitle: 'Demo Event',
      joinUrl: 'https://app.moots.com/join/token123',
    });

    expect(result.success).toBe(true);
    expect(result.emailServiceId).toBe('test-email-id');
  });

  it('sends walk-in welcome email', async () => {
    const result = await sendWalkInWelcomeEmail({
      to: 'walkin@test.com',
      recipientName: 'Walk-in Guest',
      eventTitle: 'Demo Event',
    });

    expect(result.success).toBe(true);
  });

  it('sends broadcast email with optional replyTo', async () => {
    const result = await sendBroadcastEmail({
      to: 'guest@test.com',
      recipientName: 'Guest',
      subject: 'Important Update',
      content: '<p>Hello everyone!</p>',
      eventTitle: 'Demo Event',
      replyTo: 'host@company.com',
    });

    expect(result.success).toBe(true);
  });

  it('sends follow-up email', async () => {
    const result = await sendFollowUpEmail({
      to: 'guest@test.com',
      recipientName: 'Guest',
      subject: 'Great meeting you!',
      content: '<p>Thanks for attending</p>',
      eventTitle: 'Demo Event',
    });

    expect(result.success).toBe(true);
  });

  it('sends magic link email', async () => {
    const result = await sendMagicLinkEmail({
      to: 'user@test.com',
      magicLinkUrl: 'https://app.moots.com/auth/verify?token=xyz',
    });

    expect(result.success).toBe(true);
  });

  it('sends password reset email', async () => {
    const result = await sendPasswordResetEmail({
      to: 'user@test.com',
      resetUrl: 'https://app.moots.com/reset?token=abc',
    });

    expect(result.success).toBe(true);
  });

  it('sends workspace invite email', async () => {
    const result = await sendWorkspaceInviteEmail({
      to: 'newmember@test.com',
      inviterName: 'Jane Host',
      workspaceName: 'Acme Events',
      role: 'TEAM_MEMBER',
      inviteUrl: 'https://app.moots.com/invite/token',
    });

    expect(result.success).toBe(true);
  });

  it('sends CRM sync notification email', async () => {
    const result = await sendCrmSyncNotificationEmail({
      to: 'admin@test.com',
      recipientName: 'Admin',
      provider: 'Salesforce',
      totalSynced: 100,
      successCount: 95,
      failedCount: 5,
      workspaceName: 'Acme Events',
    });

    expect(result.success).toBe(true);
  });
});
