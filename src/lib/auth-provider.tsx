import type { ReactNode } from 'react'
import type { WorkspaceUser } from './access'
import { AuthContext } from './auth-context'

export function AuthProvider({ user, children }: { user: WorkspaceUser; children: ReactNode }) {
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>
}
