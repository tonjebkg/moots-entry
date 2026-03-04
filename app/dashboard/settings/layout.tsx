'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, ScrollText, ChevronLeft, Plug, User } from 'lucide-react';
import { DashboardHeader } from '@/app/components/DashboardHeader';

type WorkspaceRole = 'OWNER' | 'ADMIN' | 'TEAM_MEMBER' | 'EXTERNAL_PARTNER' | 'VIEWER';

// Workspace settings — role-gated
const workspaceNav = [
  { href: '/dashboard/settings/workspace', label: 'Workspace', icon: Building2, roles: ['OWNER', 'ADMIN'] as WorkspaceRole[] },
  { href: '/dashboard/settings/integrations', label: 'Integrations', icon: Plug, roles: ['OWNER', 'ADMIN'] as WorkspaceRole[] },
  { href: '/dashboard/settings/audit-log', label: 'Audit Log', icon: ScrollText, roles: ['OWNER', 'ADMIN'] as WorkspaceRole[] },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [role, setRole] = useState<WorkspaceRole | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          setRole((data.role as WorkspaceRole) ?? null);
        }
      } catch {
        // silently fail
      }
    }
    load();
  }, []);

  const visibleWorkspaceItems = role
    ? workspaceNav.filter(item => item.roles.includes(role))
    : [];

  return (
    <div className="min-h-screen bg-brand-cream">
      <DashboardHeader
        rightSlot={
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-ui-tertiary hover:text-brand-terracotta font-medium transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Events
          </Link>
        }
      />

      <div className="pt-[67px] px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <nav className="w-56 shrink-0">
            <ul className="space-y-1">
              {/* My Profile — always visible */}
              <li>
                <Link
                  href="/dashboard/settings/profile"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    pathname === '/dashboard/settings/profile'
                      ? 'bg-brand-terracotta/10 text-brand-terracotta'
                      : 'text-ui-tertiary hover:text-brand-charcoal hover:bg-brand-cream'
                  }`}
                >
                  <User size={16} />
                  My Profile
                </Link>
              </li>

              {/* Workspace items — role-gated */}
              {visibleWorkspaceItems.length > 0 && (
                <>
                  <li className="pt-4 pb-1 px-3">
                    <p className="text-[11px] font-semibold text-ui-tertiary uppercase tracking-wider">
                      Workspace
                    </p>
                  </li>
                  {visibleWorkspaceItems.map(item => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            isActive
                              ? 'bg-brand-terracotta/10 text-brand-terracotta'
                              : 'text-ui-tertiary hover:text-brand-charcoal hover:bg-brand-cream'
                          }`}
                        >
                          <item.icon size={16} />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </>
              )}
            </ul>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
