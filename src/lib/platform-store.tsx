import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Conversation, Message } from './chat-types'
import { readChatStream } from './chat-types'
import type { Source, LP } from './mock-data'
import { PlatformContext as Context, type Platform } from './platform-context'
import { useWorkspaceUser } from './auth-context'

const initial: Conversation = { id: 'welcome', title: 'New chat', messages: [], draft: '', updated: 0 }
const id = () => crypto.randomUUID()

export function PlatformProvider({ children }: { children: ReactNode }) {
  const user = useWorkspaceUser()
  const cacheKey = `vitamin-c-workspace-v2:${user.id}:${user.role}`
  const [conversations, setConversations] = useState<Conversation[]>([initial])
  const [activeId, setActiveId] = useState('welcome')
  const [scope, setScope] = useState('All knowledge')
  const [source, setSource] = useState<Source | null>(null)
  const [pipeline, setPipeline] = useState<Record<string, string>>({ northhaven: 'Intro requested', verden: 'Researching' })
  const [lpDrafts, setLPDrafts] = useState<Record<string, string>>({})
  const [extraLPs, setExtraLPs] = useState<LP[]>([])
  const [lpSearch, setLPSearch] = useState<Platform['lpSearch']>({ query: 'European family offices investing in emerging climate and deep-tech venture funds', submitted: 'Europe', view: 'Discover', connection: 'All connections' })
  const [loaded, setLoaded] = useState(false)
  const runs = useRef(new Map<string, AbortController>())
  const current = useRef(conversations)
  current.current = conversations
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(cacheKey) ?? 'null')
      if (saved && Array.isArray(saved.conversations)) {
        const valid = saved.conversations.filter((c: Conversation) => typeof c?.id === 'string' && typeof c.title === 'string' && Array.isArray(c.messages) && typeof c.draft === 'string').slice(0, 30).map((c: Conversation) => ({ ...c, messages: c.messages.filter(m => m && typeof m.id === 'string' && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant')).map((m: Message) => ({ ...m, activities: m.activities ?? [], tools: m.tools ?? [], sources: m.sources ?? [], followUps: m.followUps ?? [], status: ['loading', 'thinking', 'streaming'].includes(m.status) ? 'stopped' : m.status })) }))
        if (valid.length) { setConversations(valid); setActiveId(valid.some((c: Conversation) => c.id === saved.activeId) ? saved.activeId : valid[0].id) }
        if (saved.pipeline && typeof saved.pipeline === 'object') setPipeline(saved.pipeline)
        if (saved.lpDrafts && typeof saved.lpDrafts === 'object') setLPDrafts(saved.lpDrafts)
        if (Array.isArray(saved.extraLPs)) setExtraLPs(saved.extraLPs.filter((lp: LP) => typeof lp?.id === 'string' && typeof lp.name === 'string').slice(0, 500))
        if (saved.lpSearch && typeof saved.lpSearch.query === 'string' && typeof saved.lpSearch.submitted === 'string') setLPSearch({ query: saved.lpSearch.query, submitted: saved.lpSearch.submitted, view: saved.lpSearch.view === 'Pipeline' ? 'Pipeline' : 'Discover', connection: saved.lpSearch.connection === 'Warm paths only' ? 'Warm paths only' : 'All connections' })
      }
    } catch { /* An unavailable or malformed browser cache does not block the workspace. */ }
    setLoaded(true)
    return () => { runs.current.forEach(run => run.abort()); runs.current.clear() }
  }, [cacheKey])
  useEffect(() => {
    // Wait for browser hydration before writing so SSR defaults cannot replace saved work.
    if (!loaded) return
    const timer = setTimeout(() => {
      try { localStorage.setItem(cacheKey, JSON.stringify({ conversations: conversations.slice(0, 30), activeId, pipeline, lpDrafts, extraLPs, lpSearch })) } catch { /* Browser storage may be disabled or full. */ }
    }, 250)
    return () => clearTimeout(timer)
  }, [conversations, activeId, pipeline, lpDrafts, extraLPs, lpSearch, loaded, cacheKey])

  const update = (chatId: string, messageId: string, apply: (m: Message) => Message) => setConversations(chats => chats.map(c => c.id === chatId ? { ...c, messages: c.messages.map(m => m.id === messageId ? apply(m) : m) } : c))
  const newChat = (prompt?: string) => { const chatId = id(); setConversations(chats => [{ id: chatId, title: 'New chat', messages: [], draft: '', updated: Date.now() }, ...chats]); setActiveId(chatId); if (prompt) start(prompt, undefined, chatId); return chatId }
  const start = (text: string, reuse?: string, target?: string) => {
    const chatId = target ?? activeId
    if (!text.trim() || (runs.current.has(chatId) && !runs.current.get(chatId)?.signal.aborted)) return
    const messageId = reuse ?? id()
    const assistant: Message = { id: messageId, role: 'assistant', content: '', status: 'loading', activities: [], tools: [], sources: [], followUps: [] }
    const user: Message = { ...assistant, id: id(), role: 'user', content: text.trim(), status: 'complete' }
    const controller = new AbortController()
    runs.current.set(chatId, controller)
    setConversations(chats => chats.map(c => c.id === chatId ? { ...c, title: c.messages.length ? c.title : text.trim().slice(0, 46), draft: '', updated: Date.now(), messages: reuse ? c.messages.map(m => m.id === reuse ? assistant : m) : [...c.messages, user, assistant] } : c))
    void (async () => {
      try {
        const history = (current.current.find(c => c.id === chatId)?.messages ?? []).filter(m => m.status === 'complete').filter(m => !m.evidence || m.role === 'user').slice(-12).map(m => ({ role:m.role, content:m.content.slice(0,8000) }))
        const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: text.trim(), scope, history }), signal: controller.signal })
        await readChatStream(response, event => update(chatId, messageId, m => {
          if (controller.signal.aborted) return m
          if (event.type === 'mode') return { ...m, evidence: event.evidence }
          if (event.type === 'sources') return { ...m, sources: event.sources }
          if (event.type === 'loading') return { ...m, status: 'loading' }
          if (event.type === 'thinking') return { ...m, status: 'thinking', activities: event.activities }
          if (event.type === 'tool') return { ...m, status: 'thinking', tools: m.tools.some(t => t.id === event.tool.id) ? m.tools.map(t => t.id === event.tool.id ? event.tool : t) : [...m.tools, event.tool] }
          if (event.type === 'delta') return { ...m, status: 'streaming', content: m.content + event.text }
          if (event.type === 'done') return { ...m, status: 'complete', sources: event.sources, followUps: event.followUps }
          return m
        }))
      } catch (error) {
        update(chatId, messageId, m => ({ ...m, status: controller.signal.aborted ? 'stopped' : 'error', error: controller.signal.aborted ? undefined : error instanceof Error ? error.message : 'Please try again.' }))
      } finally { if (runs.current.get(chatId) === controller) runs.current.delete(chatId) }
    })()
  }
  const stop = () => { runs.current.get(activeId)?.abort(); setConversations(chats => chats.map(c => c.id === activeId ? { ...c, messages: c.messages.map(m => ['loading', 'thinking', 'streaming'].includes(m.status) ? { ...m, status: 'stopped' } : m) } : c)) }
  const retry = (messageId: string) => { const messages = current.current.find(c => c.id === activeId)?.messages ?? []; const index = messages.findIndex(m => m.id === messageId); const user = messages.slice(0, index).reverse().find(m => m.role === 'user'); if (user) start(user.content, messageId) }
  return <Context.Provider value={{ conversations, activeId, setActiveId, newChat, send: text => start(text), stop, retry, setDraft: text => setConversations(chats => chats.map(c => c.id === activeId ? { ...c, draft: text } : c)), scope, setScope, source, setSource, pipeline, saveLP: (lpId, stage = 'Researching') => setPipeline(p => ({ ...p, [lpId]: stage })), lpDrafts, saveLPDraft: (lpId, text) => setLPDrafts(d => ({ ...d, [lpId]: text })), extraLPs, addLPs: records => setExtraLPs(previous => [...previous, ...records]), lpSearch, setLPSearch: patch => setLPSearch(previous => ({ ...previous, ...patch })) }}>{children}</Context.Provider>
}
