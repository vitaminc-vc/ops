import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Users } from 'lucide-react'
import { useWorkspaceUser } from '@/lib/auth-context'
import { Button, Modal, Picker } from './ui'
import type { Role } from '@/lib/access'

type Member = { id: string; name: string; email: string; role: Role; createdAt: string }
export function TeamPage() {
  const actor = useWorkspaceUser()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<{ member: Member; role: Role } | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const response = await fetch('/api/admin/users'); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load accounts.'); setMembers(data.users) }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to load accounts.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const save = async () => {
    if (!pending || saving) return
    setSaving(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: pending.member.id, role: pending.role }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to change access.')
      setNotice(`${pending.member.name} now has ${pending.role} access. They’ll sign in again to continue.`)
      setPending(null); await load()
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to change access.') }
    finally { setSaving(false) }
  }
  return <div className="page team-page"><div className="page-header"><h1>Team access</h1><Button onClick={() => void load()} disabled={loading}><RefreshCw size={14} />Refresh</Button></div>
    <div className="role-summary"><div><h2>Admin</h2><p>All three workspaces and team access management.</p></div><div><h2>Scout</h2><p>Vitamin-C brain and portfolio management.</p></div></div>
    {notice && <p className="team-notice" role="status">{notice}</p>}
    {error && !pending && <p className="form-error" role="alert">{error}</p>}
    <div className="surface member-list" aria-busy={loading}>
      <div className="member-list-heading"><span>Account</span><span>Role</span></div>
      {loading ? <p className="muted member-empty">Loading accounts…</p> : members.map(member => <div className="member-row" key={member.id}><div className="member-identity"><span className="avatar">{member.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</span><div><strong>{member.name}{member.id === actor.id && <span className="muted"> · You</span>}</strong><span>{member.email}</span></div></div>{member.id === actor.id ? <span className="role-value">Admin</span> : <Picker label={`Role for ${member.name}`} value={member.role === 'admin' ? 'Admin' : 'Scout'} options={['Admin', 'Scout']} onChange={value => { const role = value.toLowerCase() as Role; if (role !== member.role) { setPending({ member, role }); setError('') } }} />}</div>)}
      {!loading && !members.length && <div className="member-empty"><Users size={18} /><p>No accounts yet.</p></div>}
    </div>
    <Modal open={!!pending} onOpenChange={open => { if (!open && !saving) setPending(null) }} title="Change account access">
      <p>Give <strong>{pending?.member.name}</strong> {pending?.role} access?</p><p className="muted">{pending?.role === 'admin' ? 'They can open LP relationships and manage other accounts.' : 'They can open the brain and portfolio. LP relationships and team management will be restricted.'} Their current sessions will end.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions"><Button onClick={() => setPending(null)} disabled={saving}>Cancel</Button><Button className="primary" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Change access'}</Button></div>
    </Modal>
  </div>
}
