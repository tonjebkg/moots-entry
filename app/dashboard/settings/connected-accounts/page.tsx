'use client';

import { Link2 } from 'lucide-react';

export default function ConnectedAccountsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display text-brand-charcoal tracking-tight mb-1">
          Connected Accounts
        </h1>
        <p className="text-sm text-ui-secondary">
          Link external accounts to enrich your profile and streamline workflows.
        </p>
      </div>

      <section className="bg-white border border-ui-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-ui-border/50 flex items-center gap-2">
          <Link2 size={16} className="text-ui-tertiary" />
          <h2 className="text-base font-semibold text-brand-charcoal">Accounts</h2>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* LinkedIn */}
            <div className="flex items-center gap-3 p-4 border border-ui-border rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#0077B5]">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-brand-charcoal">LinkedIn</p>
                <p className="text-xs text-ui-tertiary">Coming soon</p>
              </div>
              <span className="text-xs font-medium text-ui-tertiary bg-brand-cream px-2 py-1 rounded-full">Soon</span>
            </div>

            {/* Gmail */}
            <div className="flex items-center gap-3 p-4 border border-ui-border rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-500">
                  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-brand-charcoal">Gmail</p>
                <p className="text-xs text-ui-tertiary">Coming soon</p>
              </div>
              <span className="text-xs font-medium text-ui-tertiary bg-brand-cream px-2 py-1 rounded-full">Soon</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
