import { createFileRoute } from '@tanstack/react-router'
import { PortfolioPage } from '@/components/portfolio-page'
export const Route = createFileRoute('/_workspace/portfolio/')({ component: PortfolioPage })
