import { createFileRoute } from '@tanstack/react-router'
import { requireIngestionService } from '../server/service-access'
import { privateJSON } from '../server/api-access'
import { syncGmailMailboxes } from '../server/gmail-sync'
export const Route=createFileRoute('/api/ingest/sync')({server:{handlers:{POST:async({request})=>{
  if(!requireIngestionService(request))return privateJSON({error:'Unauthorized.'},401)
  try{return privateJSON(await syncGmailMailboxes())}catch{return privateJSON({error:'Sync failed.'},503)}
}}}})
