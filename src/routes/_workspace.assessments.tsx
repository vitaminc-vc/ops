import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentUser } from '../lib/session'
import { AgentRunsPage } from '../components/agent-runs-page'
export const Route=createFileRoute('/_workspace/assessments')({beforeLoad:async()=>{if((await getCurrentUser())?.role!=='admin')throw redirect({to:'/'})},component:()=> <AgentRunsPage kind="assessment" title="Startup Assessment"/>})
