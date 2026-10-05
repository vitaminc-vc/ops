/* Adapted from Beautiful UI SidebarNav. Copyright (c) 2026 Shane Levine. MIT; see THIRD_PARTY_NOTICES.md. */
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Brain, ChartNoAxesCombined, LogOut, Network, PanelLeftClose, PanelLeftOpen, Plug, Search, Settings2, SquarePen, Users, X, Telescope, Building2 } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { usePlatform } from '@/lib/platform-context'
import { IconButton } from '../ui'
import { useWorkspaceUser } from '@/lib/auth-context'
import { authClient } from '@/lib/auth-client'
import { canUseLP } from '@/lib/access'

const navigation = [
  { to: '/' as const, label: 'Vitamin-C brain', icon: Brain },
  { to: '/portfolio' as const, label: 'Portfolio management', icon: ChartNoAxesCombined },
  { to: '/scout' as const, label: 'Deal Flow Scout', icon: Telescope },
  { to: '/companies' as const, label: 'Companies and documents', icon: Building2 },
  { to: '/lp' as const, label: 'LP Engine', icon: Network },
]

export default function SidebarNav() {
  const [collapsed, setCollapsed] = useState(false)
  const [hover, setHover] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const user = useWorkspaceUser()
  const reduced = useReducedMotion()
  const navigate = useNavigate()
  const path = useRouterState({ select: s => s.location.pathname })
  const { conversations, activeId, setActiveId, newChat } = usePlatform()
  const history = conversations.filter(c => c.messages.length && c.title.toLowerCase().includes(query.toLowerCase()))
  const startChat = () => { newChat(); void navigate({ to: '/' }) }
  return <motion.aside className="sidebar" aria-label="Workspace navigation" data-collapsed={collapsed} animate={{ width: collapsed ? 56 : 224 }} transition={{ duration: reduced ? 0 : .22, ease: [.22, 1, .36, 1] }}>
    <div className="sidebar-inner">
      <div className="sidebar-brand-row"><Link to="/" className="brand" aria-label="Vitamin-C home"><span className="brand-mark">V<sup>°</sup></span><span className="sidebar-copy">Vitamin-C</span></Link><IconButton className="sidebar-collapse" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</IconButton></div>
      <nav className="sidebar-nav" onMouseLeave={() => setHover(null)} aria-label="Platform">
        <button className="sidebar-row new-chat" onClick={startChat} aria-label="New chat" onMouseEnter={() => setHover('new')}><SquarePen /><span className="sidebar-copy">New chat</span>{hover === 'new' && <motion.span className="glide" layoutId="sidebar-glide" transition={{ duration: reduced ? 0 : .16 }} />}</button>
        <div className="nav-group">{navigation.filter(item => !['/lp','/scout','/companies'].includes(item.to) || canUseLP(user.role)).map(item => {
          const active = item.to === '/' ? path === '/' : path.startsWith(item.to)
          return <Link key={item.to} to={item.to} className={`sidebar-row ${active ? 'selected' : ''}`} aria-label={item.label} aria-current={active ? 'page' : undefined} onMouseEnter={() => setHover(item.to)}><item.icon /><span className="sidebar-copy">{item.label}</span>{hover === item.to && <motion.span className="glide" layoutId="sidebar-glide" transition={{ duration: reduced ? 0 : .16 }} />}</Link>
        })}</div>
      </nav>
      {conversations.some(c => c.messages.length) && <div className="chat-history sidebar-copy">
        <div className="chat-history-head">{searching ? <label className="chat-search"><Search size={13} /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} aria-label="Search chat history" placeholder="Search chats" /><IconButton aria-label="Close chat search" onClick={() => { setSearching(false); setQuery('') }}><X /></IconButton></label> : <><span>Chats</span><IconButton aria-label="Search chats" onClick={() => setSearching(true)}><Search /></IconButton></>}</div>
        {history.map(chat => <button key={chat.id} className={`history-row ${path === '/' && activeId === chat.id ? 'selected' : ''}`} onClick={() => { setActiveId(chat.id); void navigate({ to: '/' }) }} title={chat.title}>{chat.title}</button>)}
        {!history.length && searching && <p className="muted small history-empty">No matching chats.</p>}
      </div>}
      <div className="sidebar-account">
        {<><Link to="/connectors" className={`sidebar-row ${path === '/connectors' ? 'selected' : ''}`} aria-label="Connected Sources"><Plug/><span className="sidebar-copy">Connected Sources</span></Link>{user.role === 'admin' && <Link to="/settings" className={`sidebar-row ${path === '/settings' ? 'selected' : ''}`} aria-label="Settings"><Settings2/><span className="sidebar-copy">Settings</span></Link>}</>}
        {user.role === 'admin' && <Link to="/team" className={`sidebar-row ${path === '/team' ? 'selected' : ''}`} aria-label="Team access"><Users /><span className="sidebar-copy">Team access</span></Link>}
        {signOutError && <p className="form-error sidebar-copy" role="alert">{signOutError}</p>}
        <div className="sidebar-footer"><span className="avatar">{user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</span><div className="sidebar-copy"><strong title={user.email}>{user.name}</strong><span>{user.role === 'admin' ? 'Admin' : 'Scout'}</span></div><IconButton aria-label="Sign out" disabled={signingOut} onClick={() => { setSigningOut(true); setSignOutError(''); void authClient.signOut().then(result => { if (result.error) throw new Error(); window.location.assign('/login') }).catch(() => { setSigningOut(false); setSignOutError('Unable to sign out. Try again.') }) }}><LogOut /></IconButton></div>
      </div>
    </div>
  </motion.aside>
}
