'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type AgentOperationType = 'scoring' | 'enrichment' | 'briefing' | 'seating' | 'introduction' | 'follow_up' | null;

interface AgentState {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  activeOperation: AgentOperationType;
  setActiveOperation: (op: AgentOperationType) => void;
  operationSteps: string[];
  setOperationSteps: (steps: string[]) => void;
  /** Track an operation lifecycle: set type + steps, then clear when done */
  startOperation: (type: AgentOperationType, steps: string[]) => void;
  endOperation: () => void;
}

const AgentContext = createContext<AgentState | null>(null);

export function AgentContextProvider({ children }: { children: ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [activeOperation, setActiveOperation] = useState<AgentOperationType>(null);
  const [operationSteps, setOperationSteps] = useState<string[]>([]);

  const startOperation = useCallback((type: AgentOperationType, steps: string[]) => {
    setActiveOperation(type);
    setOperationSteps(steps);
  }, []);

  const endOperation = useCallback(() => {
    setActiveOperation(null);
    setOperationSteps([]);
  }, []);

  return (
    <AgentContext.Provider
      value={{
        chatOpen,
        setChatOpen,
        activeOperation,
        setActiveOperation,
        operationSteps,
        setOperationSteps,
        startOperation,
        endOperation,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentContext(): AgentState {
  const ctx = useContext(AgentContext);
  if (!ctx) {
    throw new Error('useAgentContext must be used within an AgentContextProvider');
  }
  return ctx;
}
