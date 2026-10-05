import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  const { getWorkspaceUser } = await import('../server/auth')
  return getWorkspaceUser(getRequestHeaders())
})
