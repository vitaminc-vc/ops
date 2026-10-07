import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentUser } from '../lib/session'
import { CompaniesPage } from '../components/companies-page'
export const Route=createFileRoute('/_workspace/companies')({beforeLoad:async()=>{if((await getCurrentUser())?.role!=='admin')throw redirect({to:'/'})},component:CompaniesPage})
