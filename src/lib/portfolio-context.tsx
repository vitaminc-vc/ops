import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { PortfolioResult } from './integration-types'

type PortfolioState = { data: PortfolioResult | null; loading: boolean; error: string; refresh: () => Promise<void> }
const PortfolioContext = createContext<PortfolioState | null>(null)

// Scoped to the mounted, identity-keyed workspace; never persisted or shared across users.
export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PortfolioResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const pending = useRef<Promise<void> | null>(null)
  const controller = useRef<AbortController | null>(null)
  const load = useCallback((force = false): Promise<void> => {
    if (pending.current) return pending.current
    const request = new AbortController()
    controller.current = request
    setLoading(true)
    const promise = (async () => {
      try {
        const response = await fetch(force ? '/api/portfolio?refresh=1' : '/api/portfolio', { signal: request.signal })
        const result = await response.json()
        if (!response.ok) {
          if ([401, 403].includes(response.status)) setData(null)
          throw Error(result.error || 'The portfolio could not be loaded.')
        }
        if (!request.signal.aborted) { setData(result); setError('') }
      } catch (error) {
        if (!request.signal.aborted) setError(error instanceof Error ? error.message : 'The portfolio could not be loaded.')
      } finally {
        if (controller.current === request) { pending.current = null; setLoading(false) }
      }
    })()
    pending.current = promise
    return promise
  }, [])
  useEffect(() => {
    void load()
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load() }, 60_000)
    return () => { clearInterval(timer); controller.current?.abort(); controller.current = null; pending.current = null }
  }, [load])
  const refresh = useCallback(() => load(true), [load])
  return <PortfolioContext.Provider value={{ data, loading, error, refresh }}>{children}</PortfolioContext.Provider>
}

export function usePortfolio() {
  const value = useContext(PortfolioContext)
  if (!value) throw Error('Portfolio must be loaded inside the workspace.')
  return value
}
