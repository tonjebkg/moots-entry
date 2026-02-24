/**
 * Authentication, workspace, and session types
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export type WorkspacePlan = 'PILOT' | 'STANDARD' | 'ENTERPRISE';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'TEAM_MEMBER' | 'EXTERNAL_PARTNER' | 'VIEWER';

export type TokenType = 'EMAIL_VERIFICATION' | 'MAGIC_LINK' | 'PASSWORD_RESET' | 'WORKSPACE_INVITE';

// ─── Database Row Types ─────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  full_name: string;
  avatar_url: string | null;
  email_verified: boolean;
  mfa_enabled: boolean;
  mfa_secret: string | null;
  sso_provider: string | null;
  sso_subject_id: string | null;
  last_login_at: string | null;
  failed_login_count: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: WorkspacePlan;
  owner_id: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  event_ids: string[] | null;
  invited_at: string;
  accepted_at: string | null;
  last_active_at: string | null;
}

export interface Session {
  id: string;
  user_id: string;
  workspace_id: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
  created_at: string;
}

export interface VerificationToken {
  id: string;
  user_id: string | null;
  email: string;
  token: string;
  type: TokenType;
  expires_at: string;
  used_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  workspace_id: string | null;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  previous_value: unknown | null;
  new_value: unknown | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// ─── Auth Context (returned by getSession/requireAuth) ──────────────────────

export interface AuthContext {
  user: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    email_verified: boolean;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
    plan: WorkspacePlan;
  };
  role: WorkspaceRole;
  sessionId: string;
}

// ─── API Response Types ─────────────────────────────────────────────────────

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    email_verified: boolean;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
    plan: WorkspacePlan;
  };
  role: WorkspaceRole;
}

export interface WorkspaceWithRole extends Workspace {
  role: WorkspaceRole;
}

export interface MemberWithUser extends WorkspaceMember {
  user_email: string;
  user_full_name: string;
  user_avatar_url: string | null;
}
