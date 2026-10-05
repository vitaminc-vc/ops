import { useRouterState } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { usePlatform } from '@/lib/platform-context'
import SidebarNav from './beautiful-ui/sidebar-nav'
import { Modal } from './ui'
import { EmailEvidence } from './email-evidence'
import { sourceTitle } from '../lib/source-presentation'

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: s => s.location.pathname })
  const { source, setSource } = usePlatform()
  const title = path.startsWith('/portfolio') ? 'Portfolio management' : path.startsWith('/lp') ? 'LP Engine' : path === '/team' ? 'Team access' : path==='/scout'?'Deal Flow Scout':path==='/companies'?'Companies and documents':path==='/connectors'?'Connected Sources':path==='/settings'?'Settings':'Vitamin-C brain'
  useEffect(() => { document.title = `${title} · Vitamin-C` }, [title])
  return <div className="app-shell"><SidebarNav /><div className="workspace">
    <main className="workspace-main">{children}</main>
  </div><Modal open={!!source} onOpenChange={open => { if (!open) setSource(null) }} title={source ? source.provider==='Gmail'?'Email':sourceTitle(source.title):'Source'} className={source?.provider==='Gmail'?'email-dialog':''}>{source?.provider==='Gmail'?<EmailEvidence source={source} full/>:<><div className="source-excerpt"><FileText/><p>{source?.content||source?.excerpt}</p></div>{source?.sourceUrl && <a className="button source-link" href={source.sourceUrl} target="_blank" rel="noopener noreferrer">Open source</a>}</>}</Modal></div>
}
