export interface NormalizedMessage {
  channelType: 'telegram' | 'whatsapp'
  channelUserId: string
  displayName: string
  text: string
  replyToMessageId?: string
  media?: { type: 'image' | 'voice' | 'document'; url?: string }
  timestamp: Date
}

export interface BridgeResponse {
  text: string
  contextSource?: string
}

export interface TeamMemberChannel {
  id: string
  workspace_id: string
  user_id: string
  channel_type: string
  channel_user_id: string
  display_name: string | null
  is_verified: boolean
  paired_at: string | null
  full_name?: string
  workspace_name?: string
}

export type MessageHandler = (message: NormalizedMessage) => Promise<BridgeResponse>
