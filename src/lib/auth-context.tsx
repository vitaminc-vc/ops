import { createContext, useContext } from 'react'
import type { WorkspaceUser } from './access'

export const AuthContext = createContext<WorkspaceUser | null>(null)
export function useWorkspaceUser() {
  const user = useContext(AuthContext)
  if (!user) throw new Error('Sign in to open the workspace.')
  return user
}
