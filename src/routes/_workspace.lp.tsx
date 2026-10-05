import { createFileRoute, redirect } from '@tanstack/react-router'
import { LPPage } from '@/components/lp-page'
import { getCurrentUser } from '@/lib/session'
import { canUseLP } from '@/lib/access'
export const Route = createFileRoute('/_workspace/lp')({
  beforeLoad: async () => { const user = await getCurrentUser(); if (!user || !canUseLP(user.role)) throw redirect({ to: '/' }) },
  component: LPPage,
})
