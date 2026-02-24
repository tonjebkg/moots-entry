'use client';

import type { FunnelStage } from '@/types/phase4';

interface AnalyticsFunnelProps {
  stages: FunnelStage[];
}

export function AnalyticsFunnel({ stages }: AnalyticsFunnelProps) {
  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="bg-white border border-[#e1e4e8] rounded-lg p-6 shadow-sm">
      <h3 className="font-semibold text-[#1a1a2e] mb-4">Event Funnel</h3>
      <div className="space-y-3">
        {stages.map((stage, i) => {
          const width = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 2) : 2;
          const conversionRate = i > 0 && stages[i - 1].count > 0
            ? Math.round((stage.count / stages[i - 1].count) * 100)
            : null;

          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div className="w-24 shrink-0 text-right">
                <span className="text-xs font-semibold text-[#6e6e7e]">{stage.label}</span>
              </div>
              <div className="flex-1 relative">
                <div className="h-8 bg-[#f0f2f5] rounded-md overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-500 flex items-center px-3"
                    style={{ width: `${width}%`, backgroundColor: stage.color }}
                  >
                    <span className="text-xs font-bold text-white drop-shadow-sm">
                      {stage.count}
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-12 shrink-0 text-right">
                {conversionRate !== null && (
                  <span className="text-xs text-[#6e6e7e]">{conversionRate}%</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
