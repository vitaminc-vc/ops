import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getCurrentUser } from '@/lib/session'
import { AuthProvider } from '@/lib/auth-provider'
import { PlatformProvider } from '@/lib/platform-store'
import { AppShell } from '@/components/app-shell'

export const Route = createFileRoute('/_workspace')({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUser()
    if (!user) throw redirect({ to: '/login', search: { redirect: location.href } })
    return { user }
  },
  component: Workspace,
})
function Workspace() {
  const { user } = Route.useRouteContext()
  return <AuthProvider user={user}><PlatformProvider key={`${user.id}:${user.role}`}><AppShell><Outlet /></AppShell></PlatformProvider></AuthProvider>
}
