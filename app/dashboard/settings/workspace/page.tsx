'use client';

import { useState, useEffect } from 'react';
import { Building2, Users, Plus, Loader2, Trash2, Shield } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  user_email: string;
  user_full_name: string;
  user_avatar_url: string | null;
  invited_at: string;
  accepted_at: string | null;
}

interface SessionData {
  user: { id: string; email: string };
  workspace: Workspace;
  role: string;
}

export default function WorkspaceSettingsPage() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceName, setWorkspaceName] = useState('');
  const [saving, setSaving] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('TEAM_MEMBER');
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [sessionRes, membersRes] = await Promise.all([
          fetch('/api/auth/session'),
          fetch(`/api/workspaces/placeholder/members`), // We'll fix this after getting session
        ]);

        if (sessionRes.ok) {
          const data = await sessionRes.json();
          setSession(data);
          setWorkspaceName(data.workspace.name);

          // Now fetch members with the real workspace ID
          const realMembersRes = await fetch(`/api/workspaces/${data.workspace.id}/members`);
          if (realMembersRes.ok) {
            const membersData = await realMembersRes.json();
            setMembers(membersData.members || []);
          }
        }
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function handleSaveName() {
    if (!session || !workspaceName.trim()) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/workspaces/${session.workspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: workspaceName }),
      });

      if (res.ok) {
        const data = await res.json();
        setSession(prev => prev ? { ...prev, workspace: { ...prev.workspace, name: data.workspace.name } } : null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !inviteEmail.trim()) return;
    setInviting(true);
    setInviteMessage('');

    try {
      const res = await fetch(`/api/workspaces/${session.workspace.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();

      if (res.ok) {
        setInviteMessage('Invitation sent successfully');
        setInviteEmail('');
        // Refresh members
        const membersRes = await fetch(`/api/workspaces/${session.workspace.id}/members`);
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers(membersData.members || []);
        }
      } else {
        setInviteMessage(data.error || 'Failed to invite');
      }
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!session || !confirm('Remove this member?')) return;

    await fetch(`/api/workspaces/${session.workspace.id}/members/${memberId}`, {
      method: 'DELETE',
    });

    setMembers(prev => prev.filter(m => m.id !== memberId));
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-ui-tertiary text-sm">
        <Loader2 size={16} className="animate-spin" />
        Loading...
      </div>
    );
  }

  if (!session) {
    return <div className="text-sm text-red-600">Failed to load session</div>;
  }

  const isAdmin = session.role === 'OWNER' || session.role === 'ADMIN';

  return (
    <div className="space-y-8">
      {/* Workspace Info */}
      <section>
        <h2 className="text-lg font-semibold font-display text-brand-charcoal mb-4 flex items-center gap-2">
          <Building2 size={20} />
          Workspace
        </h2>
        <div className="bg-white border border-ui-border rounded-card shadow-card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Name</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={workspaceName}
                onChange={e => setWorkspaceName(e.target.value)}
                disabled={!isAdmin}
                className="flex-1 px-3 py-2 border border-ui-border rounded-lg text-sm text-brand-charcoal focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta disabled:bg-brand-cream"
              />
              {isAdmin && (
                <button
                  onClick={handleSaveName}
                  disabled={saving || workspaceName === session.workspace.name}
                  className="px-4 py-2 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-8 text-sm">
            <div>
              <span className="text-ui-tertiary">Slug:</span>{' '}
              <span className="font-medium text-brand-charcoal">{session.workspace.slug}</span>
            </div>
            <div>
              <span className="text-ui-tertiary">Plan:</span>{' '}
              <span className="font-medium text-brand-charcoal">{session.workspace.plan}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Members */}
      <section>
        <h2 className="text-lg font-semibold font-display text-brand-charcoal mb-4 flex items-center gap-2">
          <Users size={20} />
          Team Members
        </h2>
        <div className="bg-white border border-ui-border rounded-card shadow-card divide-y divide-ui-border">
          {members.map(member => (
            <div key={member.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-cream flex items-center justify-center text-sm font-medium text-ui-tertiary">
                  {member.user_full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-brand-charcoal">{member.user_full_name}</p>
                  <p className="text-xs text-ui-tertiary">{member.user_email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${
                  member.role === 'OWNER' ? 'bg-amber-50 text-amber-700' :
                  member.role === 'ADMIN' ? 'bg-blue-50 text-blue-700' :
                  'bg-brand-cream text-ui-tertiary'
                }`}>
                  {member.role === 'OWNER' && <Shield size={10} />}
                  {member.role.replace('_', ' ')}
                </span>
                {isAdmin && member.role !== 'OWNER' && member.user_id !== session.user.id && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-1 text-ui-tertiary hover:text-red-600 transition-colors"
                    title="Remove member"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Invite */}
      {isAdmin && (
        <section>
          <h2 className="text-lg font-semibold font-display text-brand-charcoal mb-4 flex items-center gap-2">
            <Plus size={20} />
            Invite Member
          </h2>
          <div className="bg-white border border-ui-border rounded-card shadow-card p-6">
            {inviteMessage && (
              <div className={`mb-4 p-3 text-sm rounded-lg border ${
                inviteMessage.includes('success')
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {inviteMessage}
              </div>
            )}
            <form onSubmit={handleInvite} className="flex gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                required
                className="flex-1 px-3 py-2 border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="px-3 py-2 border border-ui-border rounded-lg text-sm text-brand-charcoal focus:outline-none focus:border-brand-terracotta"
              >
                <option value="ADMIN">Admin</option>
                <option value="TEAM_MEMBER">Team Member</option>
                <option value="EXTERNAL_PARTNER">External Partner</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={inviting}
                className="px-4 py-2 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {inviting ? 'Inviting...' : 'Invite'}
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
