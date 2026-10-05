import { getPool } from './db'
import { getAuth } from './auth'
import { ingestEmail, refreshIngestion, ingestionId, type InboundEmail } from './ingestion'
type Part = { mimeType?: string; filename?: string; headers?: {name:string;value:string}[]; body?: {data?:string;attachmentId?:string;size?:number}; parts?: Part[] }
type Message = { id:string;threadId:string;labelIds:string[];internalDate:string;payload:Part }
const decode = (value: string) => Buffer.from(value,'base64url').toString('utf8')
const header = (payload: Part,name: string) => payload.headers?.find(h=>h.name.toLowerCase()===name.toLowerCase())?.value || ''
export async function syncGmailMailboxes() {
  if(process.env.GMAIL_SYNC_ENABLED!=='true')return {status:'needs_setup',processed:0}
  const client=await getPool().connect();let locked=false,processed=0,failed=0
  try {
    locked=(await client.query("select pg_try_advisory_lock(hashtextextended('gmail-sync',0)) locked")).rows[0].locked
    if(!locked)return {status:'running',processed:0}
    const mailboxes=(await client.query("select m.*,a.scope from vitamin_data.mailboxes m join vitamin_auth.account a on a.id=m.account_id and a.user_id=m.user_id where m.status='connected'")).rows
    for(const mailbox of mailboxes){
      try{
        const token=await getAuth().api.getAccessToken({body:{accountId:mailbox.account_id,userId:mailbox.user_id}})
        const gmail=async<T>(path:string)=>{const r=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`,{headers:{Authorization:`Bearer ${token.accessToken}`},redirect:'error',signal:AbortSignal.timeout(20_000)});if(!r.ok)throw Error('gmail_access_failed');return r.json() as Promise<T>}
        const profile=await gmail<{emailAddress:string}>('profile');if(profile.emailAddress.toLowerCase()!==mailbox.email)throw Error('mailbox_mismatch')
        let pageToken:string|undefined,pages=0,complete=true
        const since=Math.floor(new Date(mailbox.last_sync||mailbox.connected_at).getTime()/1000)-300
        do{
          const query=`after:${since} -in:sent -in:drafts -in:spam -in:trash`
          const page=await gmail<{messages?:{id:string;threadId:string}[];nextPageToken?:string}>(`messages?maxResults=50&q=${encodeURIComponent(query)}${pageToken?`&pageToken=${encodeURIComponent(pageToken)}`:''}`)
          for(const message of page.messages||[]){
            // A disconnect takes effect before every new message, including during a long sync.
            if(!(await client.query("select 1 from vitamin_data.mailboxes where id=$1 and status='connected'",[mailbox.id])).rowCount){complete=false;break}
            const id=ingestionId(mailbox.email,message.id),old=(await client.query('select status from vitamin_data.ingestions where id=$1',[id])).rows[0]
            if(old?.status==='indexing'){const result=await refreshIngestion(id);if(!result.terminal)complete=false;continue}
            if(['indexed','excluded','review'].includes(old?.status))continue
            const thread=await gmail<{messages:Message[]}>(`threads/${message.threadId}?format=full`)
            const original=thread.messages.find(m=>m.id===message.id);if(!original)throw Error('incomplete_thread')
            const email:InboundEmail={mailbox:mailbox.email,messageId:message.id,threadId:message.threadId,from:header(original.payload,'From'),to:header(original.payload,'To'),subject:header(original.payload,'Subject'),receivedAt:new Date(Number(original.internalDate)).toISOString(),body:'',labels:original.labelIds||[],attachments:[]}
            for(const member of thread.messages){
              const texts:string[]=[],html:string[]=[]
              const visit=async(part:Part):Promise<void>=>{
                if(part.filename){let data=part.body?.data;if(!data&&part.body?.attachmentId){if((part.body.size||0)>15*1024*1024)throw Error('attachment_too_large');data=(await gmail<{data:string}>(`messages/${member.id}/attachments/${part.body.attachmentId}`)).data}
                  email.attachments.push({name:part.filename,mimeType:part.mimeType||'application/octet-stream',data:data?Buffer.from(data,'base64url').toString('base64'):''})
                }else if(part.body?.data&&part.mimeType==='text/plain')texts.push(decode(part.body.data))
                else if(part.body?.data&&part.mimeType==='text/html')html.push(decode(part.body.data).replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' '))
                for(const child of part.parts||[])await visit(child)
              }
              await visit(member.payload)
              email.body+=`\n\nFrom: ${header(member.payload,'From')}\nSubject: ${header(member.payload,'Subject')}\n${(texts.length?texts:html).join('\n')}`
            }
            if(email.attachments.length>20||email.body.length>500_000)throw Error('thread_too_large')
            const result=await ingestEmail(email,mailbox.email);processed++;if(!result.terminal)complete=false
          }
          pageToken=page.nextPageToken
          if(++pages>=10&&pageToken)throw Error('mailbox_backlog_exceeds_batch')
        }while(pageToken)
        await client.query('update vitamin_data.mailboxes set last_error=NULL,last_sync=case when $2 then now() else last_sync end where id=$1',[mailbox.id,complete])
      }catch{failed++;await client.query("update vitamin_data.mailboxes set last_error='Sync needs attention. Reconnect Google if authorization has expired.' where id=$1",[mailbox.id])}
    }
    return {status:failed?'needs_attention':'complete',processed,failed}
  }finally{if(locked)await client.query("select pg_advisory_unlock(hashtextextended('gmail-sync',0))");client.release()}
}
