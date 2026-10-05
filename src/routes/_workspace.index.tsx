import { createFileRoute } from '@tanstack/react-router'
import { BrainPage } from '@/components/brain-page'
export const Route = createFileRoute('/_workspace/')({ component: BrainPage })
