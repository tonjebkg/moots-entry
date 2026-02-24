'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, ScrollText, ChevronLeft, Plug } from 'lucide-react';
import { DashboardHeader } from '@/app/components/DashboardHeader';

const settingsNav = [
  { href: '/dashboard/settings/workspace', label: 'Workspace', icon: Building2 },
  { href: '/dashboard/settings/integrations', label: 'Integrations', icon: Plug },
  { href: '/dashboard/settings/audit-log', label: 'Audit Log', icon: ScrollText },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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

      <div className="pt-[73px] max-w-7xl mx-auto px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <nav className="w-56 shrink-0">
            <ul className="space-y-1">
              {settingsNav.map(item => {
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
