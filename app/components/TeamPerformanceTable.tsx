'use client';

import { Users } from 'lucide-react';
import type { TeamPerformance } from '@/types/phase4';

interface TeamPerformanceTableProps {
  team: TeamPerformance[];
}

export function TeamPerformanceTable({ team }: TeamPerformanceTableProps) {
  if (team.length === 0) {
    return (
      <div className="bg-white border border-ui-border rounded-lg p-6 shadow-sm">
        <h3 className="font-semibold text-brand-charcoal mb-4">Team Performance</h3>
        <div className="text-center py-8">
          <Users size={28} className="mx-auto mb-3 text-ui-tertiary opacity-50" />
          <p className="text-sm text-ui-tertiary">No team assignments yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-ui-border rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-ui-border">
        <h3 className="font-semibold text-brand-charcoal">Team Performance</h3>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-brand-cream border-b border-ui-border">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Member</th>
            <th className="px-4 py-3 text-right font-semibold text-brand-charcoal">Assigned</th>
            <th className="px-4 py-3 text-right font-semibold text-brand-charcoal">Checked In</th>
            <th className="px-4 py-3 text-right font-semibold text-brand-charcoal">Follow-ups</th>
            <th className="px-4 py-3 text-right font-semibold text-brand-charcoal">Meetings</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ui-border">
          {team.map(member => (
            <tr key={member.user_id} className="hover:bg-brand-cream transition-colors">
              <td className="px-4 py-3">
                <div className="font-medium text-brand-charcoal">{member.user_name}</div>
                <div className="text-xs text-ui-tertiary">{member.user_email}</div>
              </td>
              <td className="px-4 py-3 text-right font-semibold text-brand-charcoal">{member.assigned_guests}</td>
              <td className="px-4 py-3 text-right font-semibold text-emerald-600">{member.checked_in_guests}</td>
              <td className="px-4 py-3 text-right font-semibold text-purple-600">{member.follow_ups_sent}</td>
              <td className="px-4 py-3 text-right font-semibold text-amber-600">{member.meetings_booked}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
