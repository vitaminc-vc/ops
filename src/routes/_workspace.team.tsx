import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentUser } from '@/lib/session'
import { TeamPage } from '@/components/team-page'

export const Route = createFileRoute('/_workspace/team')({
  beforeLoad: async () => { const user = await getCurrentUser(); if (user?.role !== 'admin') throw redirect({ to: '/' }) },
  component: TeamPage,
})
