'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { AgentAvatar } from '@/app/components/ui/AgentAvatar';
import { SuggestedPrompts } from './SuggestedPrompts';
import { ActionConfirmation } from './ActionConfirmation';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contextSource?: string;
  actions?: ParsedAction[];
  createdAt: Date;
}

interface ParsedAction {
  type: string;
  params: Record<string, string | number | boolean>;
  description: string;
}

interface GlobalChatPanelProps {
  page: string;
  contactId?: string;
}

/**
 * Parse [CONTEXT_SOURCE: ...] tags from AI response.
 * Returns { contextSource, cleanedContent }.
 */
function parseContextSource(text: string): { contextSource: string | null; cleanedContent: string } {
  const match = text.match(/\[CONTEXT_SOURCE:\s*(.+?)\]/);
  if (match) {
    return {
      contextSource: match[1].trim(),
      cleanedContent: text.replace(match[0], '').trim(),
    };
  }
  return { contextSource: null, cleanedContent: text };
}

/**
 * Parse [ACTION_PROPOSAL] blocks from AI response.
 */
function parseActions(text: string): { actions: ParsedAction[]; cleanedContent: string } {
  const actionRegex = /\[ACTION_PROPOSAL\]\s*type:\s*(.+?)\s*params:\s*(\{[\s\S]+?\})\s*description:\s*(.+?)\s*\[\/ACTION_PROPOSAL\]/g;
  const actions: ParsedAction[] = [];
  let cleanedContent = text;

  let match;
  while ((match = actionRegex.exec(text)) !== null) {
    try {
      actions.push({
        type: match[1].trim(),
        params: JSON.parse(match[2].trim()),
        description: match[3].trim(),
      });
      cleanedContent = cleanedContent.replace(match[0], '');
    } catch {
      // Skip malformed action blocks
    }
  }

  return { actions, cleanedContent: cleanedContent.trim() };
}

/**
 * Global Moots Intelligence chat panel for non-event pages.
 * Persistent floating bottom bar, same UX as the event ChatPanel.
 */
export function GlobalChatPanel({ page, contactId }: GlobalChatPanelProps) {
  const [chatOpen, setChatOpen] = useState(false);
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
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          context: { page, contactId },
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

      // Parse context source and actions
      const { contextSource, cleanedContent: afterContext } = parseContextSource(fullText);
      const { actions, cleanedContent } = parseActions(afterContext);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: cleanedContent || 'I wasn\'t able to generate a response. Please try again.',
        contextSource: contextSource || undefined,
        actions: actions.length > 0 ? actions : undefined,
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
  }, [input, streaming, messages, chatOpen, page, contactId]);

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
                <span className="text-sm font-semibold text-brand-charcoal">Moots Intelligence</span>
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
                  <div className="max-w-[80%]">
                    {/* Context source indicator */}
                    {msg.role === 'assistant' && msg.contextSource && (
                      <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-purple-100 flex items-center justify-center text-[8px] text-purple-600">i</span>
                        {msg.contextSource}
                      </div>
                    )}
                    <div
                      className={`rounded-xl px-3.5 py-2 text-[15px] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-brand-charcoal text-white rounded-br-sm'
                          : 'bg-brand-cream text-brand-charcoal rounded-bl-sm'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                    {/* Action proposals */}
                    {msg.role === 'assistant' && msg.actions && msg.actions.map((action, idx) => (
                      <ActionConfirmation
                        key={`${msg.id}-action-${idx}`}
                        action={action}
                        onConfirm={() => {
                          // Could refresh data or show success
                        }}
                        onCancel={() => {
                          // Just dismiss
                        }}
                      />
                    ))}
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
            <SuggestedPrompts
              page={page}
              onSelect={(prompt) => handleSend(prompt)}
            />
          )}
          <div className="flex items-end gap-2">
            <AgentAvatar size="sm" />
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => { if (hasMessages && !chatOpen) setChatOpen(true); }}
              placeholder="Ask Moots Intelligence..."
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
