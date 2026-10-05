import { createFileRoute } from '@tanstack/react-router'
import Supermemory from 'supermemory'
import { limitedJSON, privateJSON, requireAdmin } from '@/server/api-access'
import { connectNotion, connectorOverview, notionResources, refreshPortfolio, refreshThesis, saveSettings, syncNotion, testScreening } from '@/server/integrations'

const checks = new Map<string,number>()
export const Route = createFileRoute('/api/integrations')({ server: { handlers: {
  GET: async ({ request }) => {
    const user=await requireAdmin(request);if(user instanceof Response)return user
    try{return privateJSON(await connectorOverview())}catch{return privateJSON({error:'Connection settings could not be loaded. Please retry.'},503)}
  },
  POST: async ({ request }) => {
    const user=await requireAdmin(request,true);if(user instanceof Response)return user
    try {
      const body=await limitedJSON(request)
      if(body.action==='save-settings')return privateJSON(await saveSettings(body.settings))
      if(body.action==='refresh-thesis')return privateJSON(await refreshThesis())
      if(body.action==='refresh-portfolio')return privateJSON(await refreshPortfolio())
      if(body.action==='connect-notion')return privateJSON(await connectNotion(body.token))
      if(body.action==='notion-resources')return privateJSON(await notionResources())
      if(body.action==='sync-notion')return privateJSON(await syncNotion(body.ids))
      if(body.action==='connect-mailbox')return privateJSON({error:'Google authorization and mailbox ingestion need to be configured before adding another mailbox.'},503)
      if(body.action==='screen-email') {
        const previous=checks.get(user.id)||0;if(Date.now()-previous<2000)return privateJSON({error:'Wait a moment before screening another message.'},429)
        checks.set(user.id,Date.now());for(const [id,time]of checks)if(time<Date.now()-60_000)checks.delete(id)
        return privateJSON(await testScreening(body.email,body.policy))
      }
      return privateJSON({error:'Choose a valid action.'},400)
    } catch(error) {return privateJSON({error:error instanceof Supermemory.APIError?'Email knowledge could not be checked. Please retry.':error instanceof Error?error.message:'The action failed. Please retry.'},400)}
  },
} } })
