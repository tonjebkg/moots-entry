'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Send, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useAgentContext } from './AgentContextProvider';
import { AgentAvatar } from '@/app/components/ui/AgentAvatar';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

interface ChatPanelProps {
  eventId: string;
}

const SUGGESTED_QUESTIONS = [
  'Who are my top 5 guests?',
  'Summarize the seating arrangement',
  'Who hasn\'t responded yet?',
];

/**
 * Persistent chat bar at the bottom of every event page.
 * Always visible — input is always ready. Expands to show conversation history.
 */
export function ChatPanel({ eventId }: ChatPanelProps) {
  const pathname = usePathname();
  const { chatOpen, setChatOpen } = useAgentContext();

  // Hide floating chat on Context tab — that tab has its own Moots Intelligence panel
  const isContextTab = pathname?.includes('/context');
  if (isContextTab) return null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || streaming) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setStreaming(true);
    setStreamingText('');
    // Auto-expand when sending
    if (!chatOpen) setChatOpen(true);

    try {
      const res = await fetch(`/api/events/${eventId}/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        throw new Error(`Chat failed: ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  fullText += parsed.text;
                  setStreamingText(fullText);
                }
              } catch {
                fullText += data;
                setStreamingText(fullText);
              }
            }
          }
        }
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: fullText || 'I wasn\'t able to generate a response. Please try again.',
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setStreaming(false);
      setStreamingText('');
    }
  }, [input, streaming, eventId, messages, chatOpen, setChatOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Show last 3 messages in collapsed "peek" mode
  const peekMessages = messages.slice(-3);
  const hasMessages = messages.length > 0 || streaming;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center pointer-events-none">
      <div className="w-full max-w-4xl pointer-events-auto">
        {/* Expanded messages area */}
        {chatOpen && hasMessages && (
          <div className="bg-white border border-b-0 border-ui-border rounded-t-xl shadow-panel mx-4">
            <div className="flex items-center justify-between px-4 py-2 border-b border-ui-border">
              <div className="flex items-center gap-2">
                <AgentAvatar size="sm" />
                <span className="text-sm font-semibold text-brand-charcoal">Moots Agent</span>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1 rounded text-ui-tertiary hover:text-brand-charcoal transition-colors"
              >
                <ChevronDown size={16} />
              </button>
            </div>
            <div className="max-h-[400px] overflow-y-auto px-4 py-3 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && <AgentAvatar size="sm" />}
                  <div
                    className={`max-w-[80%] rounded-xl px-3.5 py-2 text-[15px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-brand-charcoal text-white rounded-br-sm'
                        : 'bg-brand-cream text-brand-charcoal rounded-bl-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}

              {streaming && (
                <div className="flex gap-2.5">
                  <AgentAvatar size="sm" />
                  <div className="max-w-[80%] rounded-xl rounded-bl-sm px-3.5 py-2 bg-brand-cream text-brand-charcoal text-[15px] leading-relaxed">
                    {streamingText ? (
                      <div className="whitespace-pre-wrap">{streamingText}</div>
                    ) : (
                      <div className="flex items-center gap-2 text-ui-tertiary">
                        <Sparkles size={12} className="animate-pulse" />
                        <span>Thinking...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Collapsed peek — show last message snippet when collapsed and has messages */}
        {!chatOpen && hasMessages && peekMessages.length > 0 && (
          <button
            onClick={() => setChatOpen(true)}
            className="mx-4 bg-white border border-b-0 border-ui-border rounded-t-xl px-4 py-2 flex items-center gap-2 text-left hover:bg-brand-cream/50 transition-colors w-[calc(100%-2rem)]"
          >
            <AgentAvatar size="sm" />
            <p className="text-sm text-ui-secondary truncate flex-1">
              {peekMessages[peekMessages.length - 1].content.slice(0, 80)}
              {peekMessages[peekMessages.length - 1].content.length > 80 ? '...' : ''}
            </p>
            <ChevronUp size={14} className="text-ui-tertiary shrink-0" />
          </button>
        )}

        {/* Persistent input bar — always visible */}
        <div className={`mx-4 mb-4 bg-[#FFFEFA] border-[1.5px] border-[#C8B8A8] ${hasMessages ? 'rounded-b-xl' : 'rounded-xl'} px-4 py-3`} style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(184,117,94,0.08)' }}>
          {/* Suggested questions when no messages */}
          {!hasMessages && (
            <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1">
              {SUGGESTED_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="shrink-0 text-[14px] px-3 py-1.5 rounded-full bg-brand-cream text-brand-charcoal/70 hover:text-brand-terracotta hover:bg-brand-terracotta/5 transition-colors border border-[#D5CEC6] hover:border-brand-terracotta/30"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <AgentAvatar size="sm" />
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => { if (hasMessages && !chatOpen) setChatOpen(true); }}
              placeholder="Ask Moots about your event..."
              rows={1}
              className="flex-1 resize-none rounded-lg border border-ui-border px-3 py-2.5 text-base text-brand-charcoal placeholder:text-ui-tertiary focus:outline-none focus:ring-2 focus:ring-brand-terracotta/30 focus:border-brand-terracotta max-h-24"
              style={{ minHeight: '36px' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || streaming}
              className="shrink-0 p-2.5 rounded-lg bg-brand-terracotta text-white hover:bg-brand-terracotta/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
