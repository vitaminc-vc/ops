import * as Dialog from '@radix-ui/react-dialog'
import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown, X } from 'lucide-react'
import { useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'

export function Button({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`button ${className}`}>{children}</button>
}
export function IconButton({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`icon-button ${className}`}>{children}</button>
}
export function Modal({ open, onOpenChange, title, description, children, className = '', restoreFocus }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode; className?: string; restoreFocus?:()=>void }) {
  const descriptionId = useId()
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className={`dialog-content ${className}`} aria-describedby={description ? descriptionId : undefined} onCloseAutoFocus={e=>{if(restoreFocus){e.preventDefault();restoreFocus()}}}>
    <div className="dialog-header"><Dialog.Title>{title}</Dialog.Title><Dialog.Close asChild><IconButton aria-label="Close"><X /></IconButton></Dialog.Close></div>
    {description && <Dialog.Description id={descriptionId} className="dialog-description">{description}</Dialog.Description>}
    <div className="dialog-body">{children}</div>
  </Dialog.Content></Dialog.Portal></Dialog.Root>
}
export function Picker({ value, onChange, options, label, icon, className = '' }: { value: string; onChange: (value: string) => void; options: string[]; label: string; icon?: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  return <Popover.Root open={open} onOpenChange={setOpen}><Popover.Trigger asChild><button type="button" aria-label={`${label}: ${value}`} className={`picker-trigger ${className}`}>{icon}{value}<ChevronDown size={14} /></button></Popover.Trigger>
    <Popover.Portal><Popover.Content className="picker-content" sideOffset={6} align="start" onOpenAutoFocus={e => { e.preventDefault(); list.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus() }}>
      <div role="listbox" aria-label={label} ref={list} onKeyDown={e => {
        if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return
        e.preventDefault(); const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button')); const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
        buttons[e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus()
      }}>{options.map(option => <button role="option" type="button" aria-selected={value === option} key={option} onClick={() => { onChange(option); setOpen(false) }}>{option}{value === option && <Check size={14} />}</button>)}</div>
    </Popover.Content></Popover.Portal>
  </Popover.Root>
}
export function Mark({ name, tone = 'neutral' }: { name: string; tone?: string }) { return <span className={`company-mark ${tone}`} aria-hidden="true">{name.charAt(0)}</span> }
export function Stat({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) { return <div className="stat surface"><span className="caption">{label}</span><strong>{value}</strong>{detail && <span className="stat-detail">{detail}</span>}</div> }
