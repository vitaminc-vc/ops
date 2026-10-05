import { createFileRoute } from '@tanstack/react-router'
import { CompanyPage } from '@/components/portfolio-page'
export const Route = createFileRoute('/_workspace/portfolio/$companyId')({
  component: () => <CompanyPage companyId={Route.useParams().companyId} />,
})
