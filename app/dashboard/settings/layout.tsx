'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, ScrollText, ChevronLeft } from 'lucide-react';

const settingsNav = [
  { href: '/dashboard/settings/workspace', label: 'Workspace', icon: Building2 },
  { href: '/dashboard/settings/audit-log', label: 'Audit Log', icon: ScrollText },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/98 backdrop-blur-sm border-b border-[#e1e4e8] z-50">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-2xl font-bold text-[#1a1a2e] hover:text-[#0f3460] transition-colors">
              Moots
            </Link>
            <span className="text-[#6e6e7e]">/</span>
            <span className="text-sm font-medium text-[#1a1a2e]">Settings</span>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-[#6e6e7e] hover:text-[#0f3460] font-medium transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Events
          </Link>
        </div>
      </header>

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
                          ? 'bg-[#0f3460]/10 text-[#0f3460]'
                          : 'text-[#6e6e7e] hover:text-[#1a1a2e] hover:bg-[#f0f2f5]'
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
