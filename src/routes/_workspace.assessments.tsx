import { createFileRoute, redirect } from '@tanstack/react-router'

// Existing bookmarks open the Brain, where assessment guidance remains available.
export const Route = createFileRoute('/_workspace/assessments')({
  beforeLoad: () => { throw redirect({ to: '/', replace: true }) },
})
