export class ProviderError extends Error { constructor(public provider: string, public status: number, message: string) { super(message) } }
export async function providerJSON<T>(provider: string, url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, redirect: 'error', signal: init.signal || AbortSignal.timeout(25_000) })
  if (!response.ok) throw new ProviderError(provider, response.status, response.status === 401 || response.status === 403 ? `${provider} access was refused. Check the credential and shared resources.` : response.status === 429 ? `${provider} is rate limited. Try again shortly.` : `${provider} returned HTTP ${response.status}. Try again.`)
  return response.json() as Promise<T>
}
