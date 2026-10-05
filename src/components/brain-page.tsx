import { Brain, ClipboardCheck, NotebookPen, Telescope } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { usePlatform } from '@/lib/platform-context'
import type { Message } from '@/lib/chat-types'
import LoadingState from './beautiful-ui/loading-state'
import ThinkingState from './beautiful-ui/thinking-state'
import ToolChips from './beautiful-ui/tool-chips'
import PromptBar from './beautiful-ui/prompt-bar'
import StreamingText from './beautiful-ui/streaming-text'
import { Button } from './ui'
import { ChatScrollButton, ChatScrollContent, ChatScrollFrame, ChatScrollItem, ChatScrollProvider, ChatScrollViewport } from './chat-scroller'

const suggestions = [
  { icon: NotebookPen, label: 'Prepare for a founder call', prompt: 'Prepare me for a founder call with EmberGrid using its latest update.' },
  { icon: ClipboardCheck, label: 'Run a startup assessment', prompt: 'Assess EmberGrid based on its founder update. What should we investigate next?' },
  { icon: Telescope, label: 'Explore new deal flow', prompt: 'Find new companies aligned with our investment thesis' },
]

function AssistantMessage({ message, busy }: { message: Message; busy: boolean }) {
  const { setSource, send, retry } = usePlatform()
  const working = message.status === 'thinking' || message.status === 'loading'
  return <div className="assistant-message">
    {message.status === 'loading' && <LoadingState label="Gathering context" />}
    {!!message.activities.length && <ThinkingState status={working ? 'working' : message.status === 'stopped' ? 'stopped' : 'done'} rows={message.activities} active="Thinking" done={message.status === 'stopped' ? 'Stopped' : 'Context reviewed'} icon={<Brain size={15} strokeWidth={2} />} />}
    {!!message.tools.length && <ToolChips steps={message.tools.map(tool => ({ icon: 'read', label: tool.label, chip: tool.source, mono: false, detailMono: false, detail: [{ text: tool.detail }] }))} diffs={[]} revealed={message.tools.length} labels={{ header: `${message.tools.length} tool ${message.tools.length === 1 ? 'call' : 'calls'}`, more: '' }} className="chat-tool-chips" />}
    {!!message.content && <StreamingText evidence={message.evidence} text={message.content} streaming={message.status === 'streaming' || busy} sources={message.sources} followUps={message.status === 'complete' && !busy ? message.followUps : []} onSource={setSource} onFollowUp={send} onRetry={() => retry(message.id)} />}
    {message.status === 'error' && <div className="response-error" role="alert"><p>{message.error}</p><Button onClick={() => retry(message.id)}>Try again</Button></div>}
    {message.status === 'stopped' && <div className="response-stopped"><span>Response stopped.</span><Button className="ghost" onClick={() => retry(message.id)}>Try again</Button></div>}
  </div>
}

export function BrainPage() {
  const { conversations, activeId, send, stop, setDraft, scope, setScope } = usePlatform()
  const chat = conversations.find(c => c.id === activeId) ?? conversations[0]
  const busy = chat.messages.some(m => ['loading', 'thinking', 'streaming'].includes(m.status))
  const hasMessages = !!chat.messages.length
  const reduced = useReducedMotion()
  return <ChatScrollProvider key={activeId} autoScroll defaultScrollPosition="last-anchor" scrollPreviousItemPeek={32} scrollMargin={24}>
    <div className={`brain-page ${hasMessages ? 'has-messages' : ''}`}>
      {!hasMessages?<div className="chat-scroll welcome-scroll"><motion.div className="chat-welcome" initial={{opacity:reduced?1:0}} animate={{opacity:1}} transition={{duration:.12}}><h1>Vitamin-C brain</h1><PromptBar value={chat.draft} onChange={setDraft} onSend={send} busy={busy} onStop={stop} scope={scope} onScopeChange={setScope}/><div className="chat-suggestions">{suggestions.map(item=><button key={item.label} onClick={()=>send(item.prompt)}><item.icon/><span>{item.label}</span></button>)}</div></motion.div></div>:
        <ChatScrollFrame className="chat-scroll-frame"><ChatScrollViewport className="chat-scroll" aria-label="Conversation"><ChatScrollContent className="conversation" aria-live="off">
          {chat.messages.map(message=><ChatScrollItem key={message.id} messageId={message.id} scrollAnchor={message.role==='user'}>{message.role==='user'?<div className="user-message"><p>{message.content}</p></div>:<AssistantMessage message={message} busy={['loading','thinking','streaming'].includes(message.status)}/>}</ChatScrollItem>)}
        </ChatScrollContent></ChatScrollViewport></ChatScrollFrame>}
      {hasMessages && <div className="chat-compose-dock"><ChatScrollButton streaming={busy}/><PromptBar value={chat.draft} onChange={setDraft} onSend={send} busy={busy} onStop={stop} scope={scope} onScopeChange={setScope} compact/></div>}
      <span className="sr-only" role="status" aria-live="polite">{busy?'Response in progress.':'Ready.'}</span>
    </div>
  </ChatScrollProvider>
}
