'use client';

import { Sparkles } from 'lucide-react';

interface AgentAvatarProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

const iconSizes = { sm: 12, md: 14, lg: 18 };

/**
 * Moots Agent avatar — used in activity feeds, chat, and anywhere the agent "speaks".
 */
export function AgentAvatar({ size = 'md' }: AgentAvatarProps) {
  return (
    <div
      className={`${sizeClasses[size]} shrink-0 rounded-full bg-gradient-to-br from-brand-terracotta to-brand-forest flex items-center justify-center`}
    >
      <Sparkles size={iconSizes[size]} className="text-white" />
    </div>
  );
}
