import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentUser } from '@/lib/session'
import { ConnectorsPage } from '@/components/connectors-page'
export const Route=createFileRoute('/_workspace/connectors')({beforeLoad:async()=>{if((await getCurrentUser())?.role!=='admin')throw redirect({to:'/'})},component:ConnectorsPage})
