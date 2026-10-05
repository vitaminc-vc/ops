import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentUser } from '@/lib/session'
import { ConnectorsPage } from '@/components/connectors-page'
import { MailboxConnection } from '@/components/mailbox-connection'
import { useWorkspaceUser } from '@/lib/auth-context'
function Sources(){const user=useWorkspaceUser();return user.role==='admin'?<ConnectorsPage/>:<div className="page integrations-page"><header className="page-header"><h1>Connected Sources</h1></header><MailboxConnection/></div>}
export const Route=createFileRoute('/_workspace/connectors')({beforeLoad:async()=>{if(!await getCurrentUser())throw redirect({to:'/login',search:{redirect:'/connectors'}})},component:Sources})
