/* Adapted from Beautiful UI PromptBar / ChatComposer. Copyright (c) 2026 Shane Levine. MIT; see THIRD_PARTY_NOTICES.md. */
import * as Popover from '@radix-ui/react-popover'
import { ArrowUp, FileText, Layers, Paperclip, Plus, Square, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { IconButton, Picker } from '../ui'
import { useWorkspaceUser } from '@/lib/auth-context'
import { canUseLP } from '@/lib/access'

export default function PromptBar({ value, onChange, onSend, busy, onStop, scope, onScopeChange, compact = false }: { value: string; onChange: (text: string) => void; onSend: (text: string) => void; busy: boolean; onStop: () => void; scope: string; onScopeChange: (scope: string) => void; compact?: boolean }) {
  const input = useRef<HTMLTextAreaElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const [attachment, setAttachment] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const user = useWorkspaceUser()
  useEffect(() => { const el = input.current; if (el) { el.style.height = '0px'; el.style.height = `${Math.min(220, Math.max(compact ? 52 : 104, el.scrollHeight))}px` } }, [value, compact])
  const submit = () => { if (!value.trim() || busy) return; onSend(value); setAttachment(null) }
  return <div className={`prompt-bar ${compact ? 'compact' : ''}`}>
    <form className="composer" onSubmit={e => { e.preventDefault(); submit() }}>
      <label htmlFor="brain-prompt" className="sr-only">Ask Vitamin-C brain</label>
      <textarea id="brain-prompt" ref={input} value={value} onChange={e => onChange(e.target.value)} maxLength={4000} rows={compact ? 2 : 3} placeholder={compact ? 'Ask a follow-up…' : 'Ask anything about your fund, companies, or conversations…'} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit() } }} />
      {attachment && <div className="attachment"><FileText size={13} /><span>{attachment}</span><IconButton aria-label="Remove attachment" onClick={() => setAttachment(null)}><X /></IconButton></div>}
      <div className="composer-controls"><div className="composer-tools"><Popover.Root open={open} onOpenChange={setOpen}><Popover.Trigger asChild><IconButton aria-label="Add attachments and context"><Plus /></IconButton></Popover.Trigger><Popover.Portal><Popover.Content className="picker-content" side="top" align="start" sideOffset={8}><button onClick={() => { file.current?.click(); setOpen(false) }}><Paperclip size={15} />Attach a document</button><button onClick={() => { onScopeChange('Portfolio companies'); setOpen(false); input.current?.focus() }}><Layers size={15} />Use portfolio context</button></Popover.Content></Popover.Portal></Popover.Root>
        <Picker label="Knowledge scope" value={scope} options={['All knowledge', 'Portfolio companies', 'Deal flow', ...(canUseLP(user.role) ? ['LP relationships'] : [])]} onChange={onScopeChange} />
      </div>{busy ? <IconButton className="send-button" aria-label="Stop response" onClick={onStop}><Square size={12} fill="currentColor" /></IconButton> : <button type="submit" className="icon-button send-button" aria-label="Send message" disabled={!value.trim()}><ArrowUp /></button>}</div>
    </form><input ref={file} type="file" hidden accept=".pdf,.xlsx,.csv,.docx,.txt" onChange={e => { setAttachment(e.target.files?.[0]?.name ?? null); e.target.value = '' }} />
  </div>
}
