'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, Settings, LogOut, ChevronDown, Check, Loader2 } from 'lucide-react';
import { AvatarInitials } from '@/app/components/ui/AvatarInitials';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface UserAvatarDropdownProps {
  userName: string | null;
  userEmail?: string | null;
  currentWorkspace: Workspace | null;
}

const roleBadgeColor: Record<string, string> = {
  owner: 'bg-brand-terracotta/10 text-brand-terracotta',
  admin: 'bg-brand-forest/10 text-brand-forest',
  team_member: 'bg-blue-50 text-blue-700',
  external_partner: 'bg-amber-50 text-amber-700',
  viewer: 'bg-gray-100 text-gray-600',
};

export function UserAvatarDropdown({ userName, userEmail, currentWorkspace }: UserAvatarDropdownProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [switching, setSwitching] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load workspaces when dropdown opens
  useEffect(() => {
    if (!open) return;
    async function load() {
      try {
        const res = await fetch('/api/workspaces');
        if (res.ok) {
          const data = await res.json();
          setWorkspaces(data.workspaces);
        }
      } catch {
        // silently fail
      }
    }
    load();
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  async function handleSwitch(workspaceId: string) {
    if (switching || workspaceId === currentWorkspace?.id) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      const res = await fetch('/api/workspaces/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });
      if (res.ok) {
        window.location.href = '/dashboard';
      } else {
        setSwitching(false);
      }
    } catch {
      setSwitching(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full hover:ring-2 hover:ring-brand-terracotta/20 transition-all"
        aria-label="User menu"
      >
        {userName ? (
          <AvatarInitials name={userName} size={32} />
        ) : (
          <div className="w-8 h-8 rounded-full bg-ui-border" />
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-ui-border z-50 overflow-hidden">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-ui-border/50 bg-brand-cream/30">
            <div className="flex items-center gap-3">
              {userName ? (
                <AvatarInitials name={userName} size={36} />
              ) : (
                <div className="w-9 h-9 rounded-full bg-ui-border" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-charcoal truncate">{userName || 'User'}</p>
                {userEmail && (
                  <p className="text-xs text-ui-tertiary truncate">{userEmail}</p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation items */}
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); router.push('/dashboard/settings/profile'); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-brand-charcoal hover:bg-brand-cream/60 transition-colors"
            >
              <User size={15} className="text-ui-tertiary" />
              My Profile
            </button>
            <button
              onClick={() => { setOpen(false); router.push('/dashboard/settings/workspace'); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-brand-charcoal hover:bg-brand-cream/60 transition-colors"
            >
              <Settings size={15} className="text-ui-tertiary" />
              Settings
            </button>
          </div>

          {/* Workspace switcher */}
          {workspaces.length > 1 && (
            <div className="border-t border-ui-border/50">
              <div className="px-4 py-2">
                <p className="text-[11px] font-semibold text-ui-tertiary uppercase tracking-wider">Workspaces</p>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {workspaces.map(ws => {
                  const isCurrent = ws.id === currentWorkspace?.id;
                  return (
                    <button
                      key={ws.id}
                      onClick={() => handleSwitch(ws.id)}
                      disabled={switching}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-brand-cream/60 transition-colors disabled:opacity-50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${isCurrent ? 'font-semibold text-brand-charcoal' : 'font-medium text-brand-charcoal'}`}>
                          {ws.name}
                        </p>
                        <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${roleBadgeColor[ws.role] ?? 'bg-gray-100 text-gray-600'}`}>
                          {ws.role.replace('_', ' ')}
                        </span>
                      </div>
                      {isCurrent && <Check size={14} className="shrink-0 text-brand-terracotta" />}
                      {switching && !isCurrent && <Loader2 size={14} className="shrink-0 animate-spin text-ui-tertiary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Logout */}
          <div className="border-t border-ui-border/50 py-1">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <LogOut size={15} />
              {loggingOut ? 'Logging out...' : 'Log Out'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
