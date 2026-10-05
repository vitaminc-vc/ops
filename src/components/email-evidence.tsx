import { useEffect, useState } from 'react'
import { ChevronDown, FileText } from 'lucide-react'
import type { Source } from '../lib/mock-data'
import { emailBody, senderIdentity, sourceTitle } from '../lib/source-presentation'
import { SourceLogo } from './source-logo'

export function EmailEvidence({source,full=false}:{source:Source;full?:boolean}) {
  const [expanded,setExpanded]=useState(false)
  if(full)return <EmailContent source={source} full/>
  return <details className="email-reference surface" onToggle={event=>setExpanded(event.currentTarget.open)}>
    <summary><SourceLogo provider="Gmail"/><span className="email-reference-title"><strong>{sourceTitle(source.title)}</strong><small>{senderIdentity(source.from).name}</small></span><span className="email-reference-action">{expanded?'Hide email':'View email'}</span><ChevronDown className="email-reference-chevron" size={16}/></summary>
    {expanded&&<div className="email-reference-body"><EmailContent source={source} full/></div>}
  </details>
}

function EmailContent({source,full=false}:{source:Source;full?:boolean}) {
  const [loaded,setLoaded]=useState<Source | null>(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0)
  // Older saved conversations contain only search snippets. Hydrate their original email too.
  useEffect(()=>{
    if(source.content!==undefined)return
    const abort=new AbortController()
    setError(false)
    fetch(`/api/knowledge/email?id=${encodeURIComponent(source.id)}`,{signal:abort.signal,credentials:'same-origin'})
      .then(async response=>{if(!response.ok)throw new Error('Email unavailable');return response.json() as Promise<Source>})
      .then(email=>{if(!abort.signal.aborted)setLoaded(email)})
      .catch(()=>{if(!abort.signal.aborted)setError(true)})
    return ()=>abort.abort()
  },[source.id,source.content,attempt])
  const email=loaded?.id===source.id && source.content===undefined?loaded:source
  const sender=senderIdentity(email.from), body=emailBody(email.content ?? '')
  const date=source.receivedAt && !Number.isNaN(Date.parse(source.receivedAt)) ? new Date(source.receivedAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:full?'numeric':undefined}):''
  return <article className={`email-evidence surface ${full?'email-evidence-full':''}`} aria-label={`Email: ${sourceTitle(source.title)}`}>
    <header className="email-evidence-header"><span className="sender-avatar" aria-hidden="true">{sender.name.split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase()}</span><div className="email-sender"><strong>{sender.name}</strong><span>{sender.address || source.from || 'Gmail'}{date && <><span aria-hidden="true"> · </span><time dateTime={source.receivedAt}>{date}</time></>}</span></div><SourceLogo provider="Gmail"/></header>
    <div className="email-evidence-content"><h3>{sourceTitle(email.title)}</h3>{email.to && <p className="email-recipient">To: {email.to}</p>}<div className="email-body">{body || (error?<><span>The full email could not be loaded.</span> <button type="button" className="email-retry" onClick={()=>setAttempt(n=>n+1)}>Try again</button></>:<span role="status">Loading email…</span>)}</div>
      {!!email.attachments?.length && <div className="email-attachments">{email.attachments.map((file,i)=><span className="email-attachment" key={`${file.name}-${i}`}><FileText/><span><strong>{file.name}</strong><small>{file.mimeType?.includes('pdf')?'PDF':file.mimeType || 'Attachment'}{file.size?` · ${Math.max(1,Math.round(file.size/1024))} KB`:''}</small></span></span>)}</div>}
    </div>
  </article>
}
