'use client';

import { Users } from 'lucide-react';
import type { TeamPerformance } from '@/types/phase4';

interface TeamPerformanceTableProps {
  team: TeamPerformance[];
}

export function TeamPerformanceTable({ team }: TeamPerformanceTableProps) {
  if (team.length === 0) {
    return (
      <div className="bg-white border border-[#e1e4e8] rounded-lg p-6 shadow-sm">
        <h3 className="font-semibold text-[#1a1a2e] mb-4">Team Performance</h3>
        <div className="text-center py-8">
          <Users size={28} className="mx-auto mb-3 text-[#6e6e7e] opacity-50" />
          <p className="text-sm text-[#6e6e7e]">No team assignments yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e1e4e8] rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-[#e1e4e8]">
        <h3 className="font-semibold text-[#1a1a2e]">Team Performance</h3>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-[#f8f9fa] border-b border-[#e1e4e8]">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-[#1a1a2e]">Member</th>
            <th className="px-4 py-3 text-right font-semibold text-[#1a1a2e]">Assigned</th>
            <th className="px-4 py-3 text-right font-semibold text-[#1a1a2e]">Checked In</th>
            <th className="px-4 py-3 text-right font-semibold text-[#1a1a2e]">Follow-ups</th>
            <th className="px-4 py-3 text-right font-semibold text-[#1a1a2e]">Meetings</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e1e4e8]">
          {team.map(member => (
            <tr key={member.user_id} className="hover:bg-[#f8f9fa] transition-colors">
              <td className="px-4 py-3">
                <div className="font-medium text-[#1a1a2e]">{member.user_name}</div>
                <div className="text-xs text-[#6e6e7e]">{member.user_email}</div>
              </td>
              <td className="px-4 py-3 text-right font-semibold text-[#1a1a2e]">{member.assigned_guests}</td>
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
