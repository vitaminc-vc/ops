import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentUser } from '@/lib/session'
import { safeRedirect } from '@/lib/access'
import { LoginPage } from '@/components/login-page'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({ redirect: safeRedirect(search.redirect) }),
  beforeLoad: async ({ search }) => { if (await getCurrentUser()) throw redirect({ href: safeRedirect(search.redirect) }) },
  component: () => <LoginPage redirectTo={Route.useSearch().redirect} />,
})
