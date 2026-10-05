import { createContext, useContext } from 'react'
import type { Conversation } from './chat-types'
import type { Source, LP } from './mock-data'

export type Platform = {
  conversations: Conversation[]; activeId: string; setActiveId: (id: string) => void;
  newChat: (prompt?: string) => string; send: (text: string) => void; stop: () => void; retry: (messageId: string) => void;
  setDraft: (text: string) => void; scope: string; setScope: (scope: string) => void;
  source: Source | null; setSource: (source: Source | null) => void;
  pipeline: Record<string, string>; saveLP: (id: string, stage?: string) => void;
  lpDrafts: Record<string, string>; saveLPDraft: (id: string, text: string) => void;
  extraLPs: LP[]; addLPs: (records: LP[]) => void;
  lpSearch: { query: string; submitted: string; view: string; connection: string };
  setLPSearch: (patch: Partial<Platform['lpSearch']>) => void;
}

// A stable module keeps provider and consumers on the same context during Fast Refresh.
export const PlatformContext = createContext<Platform | null>(null)
export function usePlatform() { const value = useContext(PlatformContext); if (!value) throw new Error('PlatformProvider is required'); return value }
