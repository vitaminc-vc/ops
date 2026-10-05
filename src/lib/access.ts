export type Role = 'admin' | 'scout'
export type WorkspaceUser = { id: string; name: string; email: string; image: string | null; role: Role }
export const isRole = (value: unknown): value is Role => value === 'admin' || value === 'scout'
export const canUseLP = (role: Role) => role === 'admin'
export const isLPRequest = (prompt: string, scope: string) => scope === 'LP relationships' || /\blps?\b|family offices?|limited partners?|fundrais|\binvestors?\b/i.test(prompt)
export function safeRedirect(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/'
  return value.split('?')[0] === '/login' || value.startsWith('/api/') ? '/' : value
}
