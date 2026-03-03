import { neon } from '@neondatabase/serverless'
import { config } from './config.js'
import type { TeamMemberChannel } from './types.js'

const sql = neon(config.databaseUrl)

/**
 * Look up a verified team member by their messaging channel identity.
 * Returns null if no verified pairing exists.
 */
export async function lookupTeamMember(
  channelType: string,
  channelUserId: string
): Promise<TeamMemberChannel | null> {
  const rows = await sql`
    SELECT tmc.*, u.full_name, w.name as workspace_name
    FROM team_member_channels tmc
    JOIN users u ON u.id = tmc.user_id
    JOIN workspaces w ON w.id = tmc.workspace_id
    WHERE tmc.channel_type = ${channelType}
      AND tmc.channel_user_id = ${channelUserId}
      AND tmc.is_verified = true
    LIMIT 1
  `
  return (rows[0] as TeamMemberChannel) ?? null
}

/**
 * Create a 6-digit pairing code for a messaging channel user.
 * If the channel already has an unverified entry, the code is updated.
 * The code expires after 10 minutes.
 *
 * Note: At this point we don't know which Moots user or workspace owns this channel.
 * The pairing_code is verified from the dashboard side, which sets the real user_id + workspace_id.
 * We store placeholder IDs here; they get overwritten on verification.
 */
export async function createPairingCode(
  channelType: string,
  channelUserId: string,
  displayName: string
): Promise<string> {
  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  // Upsert: if channel already exists but unverified, update the code
  // We need a placeholder user_id and workspace_id for the initial insert.
  // These will be replaced when the dashboard user verifies the code.
  await sql`
    INSERT INTO team_member_channels (
      workspace_id, user_id, channel_type, channel_user_id,
      display_name, pairing_code, pairing_expires_at
    )
    VALUES (
      (SELECT id FROM workspaces LIMIT 1),
      (SELECT id FROM users LIMIT 1),
      ${channelType},
      ${channelUserId},
      ${displayName},
      ${code},
      ${expiresAt.toISOString()}
    )
    ON CONFLICT (channel_type, channel_user_id)
    DO UPDATE SET
      pairing_code = ${code},
      pairing_expires_at = ${expiresAt.toISOString()},
      display_name = ${displayName}
  `

  return code
}

/**
 * Update last_message_at timestamp for an active channel.
 */
export async function updateLastMessage(
  channelType: string,
  channelUserId: string
): Promise<void> {
  await sql`
    UPDATE team_member_channels
    SET last_message_at = NOW()
    WHERE channel_type = ${channelType}
      AND channel_user_id = ${channelUserId}
  `
}
