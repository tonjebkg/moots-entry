'use client';

import { MessageCircle } from 'lucide-react';
import { useAgentContext } from './AgentContextProvider';

interface ChatToggleProps {
  eventId: string;
}

/**
 * Floating button (bottom-right) to open/close the Chat Panel.
 * Renders on every event page via the layout.
 */
export function ChatToggle({ eventId: _eventId }: ChatToggleProps) {
  const { chatOpen, setChatOpen } = useAgentContext();

  if (chatOpen) return null;

  return (
    <button
      onClick={() => setChatOpen(true)}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-br from-brand-terracotta to-brand-forest text-white rounded-full shadow-cta hover:shadow-lg transition-all hover:scale-105"
      title="Talk to Moots Agent"
    >
      <MessageCircle size={18} />
      <span className="text-sm font-semibold">Ask Moots</span>
    </button>
  );
}
