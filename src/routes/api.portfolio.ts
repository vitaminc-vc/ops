import { createFileRoute } from '@tanstack/react-router'
import { getWorkspaceUser } from '@/server/auth'
import { readIntegrationState } from '@/server/integration-store'
import { getPortfolio } from '@/server/airtable'
import { privateJSON } from '@/server/api-access'
export const Route=createFileRoute('/api/portfolio')({server:{handlers:{GET:async({request})=>{
  const user=await getWorkspaceUser(request.headers);if(!user)return privateJSON({error:'Sign in to view the portfolio.'},401)
  const state=await readIntegrationState();if(user.role!=='admin'&&!state.settings.portfolioScoutAccess)return privateJSON({error:'Your admin has not shared portfolio records with scouts yet.'},403)
  try{return privateJSON(await getPortfolio(new URL(request.url).searchParams.get('refresh')==='1'))}catch(error){return privateJSON({error:error instanceof Error?error.message:'Portfolio unavailable.'},503)}
}}}})
