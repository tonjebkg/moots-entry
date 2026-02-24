'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface CapacityGaugeProps {
  filled: number;
  total: number;
  className?: string;
}

export function CapacityGauge({ filled, total, className = '' }: CapacityGaugeProps) {
  const percentage = total > 0 ? Math.min((filled / total) * 100, 100) : 0;
  const overCapacity = filled > total;

  // Color based on capacity
  let color = '#10b981'; // green
  if (percentage >= 100) {
    color = '#ef4444'; // red
  } else if (percentage >= 80) {
    color = '#f59e0b'; // amber
  }

  return (
    <div className={`capacity-gauge ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-[#1a1a2e]">
          Capacity
        </span>
        <span className="text-sm font-semibold" style={{ color }}>
          {filled} / {total} seats
        </span>
      </div>

      <div className="w-full h-3 bg-[#f8f9fa] rounded-full overflow-hidden border border-[#e1e4e8]">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {overCapacity && (
        <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
          <AlertTriangle size={16} />
          <span className="font-medium">Over capacity</span>
        </div>
      )}
    </div>
  );
}

interface CompactCapacityGaugeProps {
  filled: number;
  total: number;
}

export function CompactCapacityGauge({ filled, total }: CompactCapacityGaugeProps) {
  const percentage = total > 0 ? Math.min((filled / total) * 100, 100) : 0;
  const overCapacity = filled > total;

  let color = 'text-emerald-600';
  if (percentage >= 100) {
    color = 'text-red-600';
  } else if (percentage >= 80) {
    color = 'text-amber-600';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${color}`}>
      <span>{filled} / {total}</span>
      {overCapacity && <AlertTriangle size={14} />}
    </span>
  );
}
