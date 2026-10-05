import { Link, useRouter } from '@tanstack/react-router'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { authClient } from '@/lib/auth-client'
import { safeRedirect } from '@/lib/access'

export function LoginPage({ redirectTo }: { redirectTo: string }) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const result = mode === 'sign-up'
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password })
      if (result.error) { setError(result.error.message || 'Unable to sign in. Please try again.'); return }
      setPassword('')
      await router.invalidate()
      window.location.assign(safeRedirect(redirectTo))
    } catch { setError('Unable to connect. Please try again.') }
    finally { setBusy(false) }
  }
  return <main className="auth-page"><div className="auth-panel">
    <Link to="/" className="brand auth-brand" aria-label="Vitamin-C home"><span className="brand-mark">V<sup>°</sup></span><span>Vitamin-C</span></Link>
    <h1>{mode === 'sign-up' ? 'Create your account' : 'Sign in to Vitamin-C'}</h1>
    <form onSubmit={submit} className="auth-form">
      {mode === 'sign-up' && <label className="auth-field"><span>Name</span><input name="name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} required maxLength={100} disabled={busy} /></label>}
      <label className="auth-field"><span>Email</span><input type="email" name="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} disabled={busy} /></label>
      <label className="auth-field"><span>Password</span><input type="password" name="password" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === 'sign-up' ? 12 : undefined} maxLength={128} aria-describedby={mode === 'sign-up' ? 'password-hint' : undefined} disabled={busy} /></label>
      {mode === 'sign-up' && <p className="muted small" id="password-hint">Use at least 12 characters. New accounts receive scout access.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary auth-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={16} />{mode === 'sign-up' ? 'Creating account…' : 'Signing in…'}</> : <>{mode === 'sign-up' ? 'Create account' : 'Sign in'}<ArrowRight size={16} /></>}</button>
    </form>
    <p className="auth-switch muted">{mode === 'sign-up' ? 'Already have an account?' : 'New to Vitamin-C?'} <button className="text-button" type="button" disabled={busy} onClick={() => { setMode(mode === 'sign-up' ? 'sign-in' : 'sign-up'); setPassword(''); setError('') }}>{mode === 'sign-up' ? 'Sign in' : 'Create account'}</button></p>
  </div></main>
}
