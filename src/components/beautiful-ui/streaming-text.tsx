/* Adapted from Beautiful UI StreamingText. Copyright (c) 2026 Shane Levine. MIT; see THIRD_PARTY_NOTICES.md. */
import { ArrowUpRight, Check, Copy, RotateCcw, ThumbsDown, ThumbsUp } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Streamdown } from 'streamdown'
import type { Source } from '@/lib/mock-data'
import { IconButton } from '../ui'
import { SourceLogo } from '../source-logo'
import { citedSources, sourceTitle } from '@/lib/source-presentation'

type MarkdownNode = { type:string;value?:string;url?:string;children?:MarkdownNode[] }
function remarkCitations(options:{count:number}) {
  return (tree:MarkdownNode) => {
    const visit=(node:MarkdownNode) => {
      if(!node.children || ['code','inlineCode','link','image'].includes(node.type))return
      node.children=node.children.flatMap(child=>{
        if(child.type!=='text' || !child.value){visit(child);return [child]}
        const value=child.value, parts:MarkdownNode[]=[];let start=0
        for(const match of value.matchAll(/\[(\d{1,2})\]/g)){const number=Number(match[1]);if(number<1||number>options.count)continue;const at=match.index!;if(at>start)parts.push({type:'text',value:value.slice(start,at)});parts.push({type:'link',url:`#source-${number}`,children:[{type:'text',value:match[1]}]});start=at+match[0].length}
        if(!parts.length)return [child];if(start<value.length)parts.push({type:'text',value:value.slice(start)});return parts
      })
    };visit(tree)
  }
}

export default function StreamingText({ text, streaming, evidence, sources, followUps, onSource, onFollowUp, onRetry }: { text: string; streaming: boolean; evidence?: boolean; sources: Source[]; followUps: string[]; onSource: (source: Source) => void; onFollowUp: (text: string) => void; onRetry: () => void }) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reduced = useReducedMotion()
  const citations=useMemo(()=>[[remarkCitations,{count:sources.length}]] as [typeof remarkCitations,{count:number}][],[sources.length])
  const referencedSources=useMemo(()=>citedSources(text,sources),[text,sources])
  const legacy=evidence && /^I found (this email|these emails)/.test(text)
  const components=useMemo(()=>({
    img:()=>null,
    a:({href,children}:{href?:string;children?:React.ReactNode})=>{
      const match=href?.match(/^#source-(\d+)$/),source=match?sources[Number(match[1])-1]:undefined
      return source?<button type="button" className="inline-citation" aria-label={`Read source ${match![1]}: ${sourceTitle(source.title)}`} onClick={()=>onSource(source)}><SourceLogo provider={source.provider}/>{children}</button>:<span>{children}</span>
    },
    p:({children}:{children?:React.ReactNode})=><p>{children}</p>,
    h2:({children}:{children?:React.ReactNode})=><h2>{children}</h2>,
    h3:({children}:{children?:React.ReactNode})=><h3>{children}</h3>,
    ul:({children}:{children?:React.ReactNode})=><ul>{children}</ul>,
    ol:({children}:{children?:React.ReactNode})=><ol>{children}</ol>,
    li:({children}:{children?:React.ReactNode})=><li>{children}</li>,
  }),[sources,onSource])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  return <div className="streaming-answer"><div className="markdown">{legacy?<p>Relevant correspondence {sources.map((source,index)=>source.provider==='Gmail'?<button key={source.id} type="button" className="inline-citation" aria-label={`Read source ${index+1}: ${sourceTitle(source.title)}`} onClick={()=>onSource(source)}><SourceLogo provider="Gmail"/>{index+1}</button>:null)}</p>:<Streamdown mode="streaming" isAnimating={streaming} animated={reduced?false:{animation:'fadeIn',duration:120,stagger:5,maxBacklogMs:120}} skipHtml components={components} remarkPlugins={citations} controls={false} disableAutolinkProtocols={['http','https','mailto']} urlTransform={url=>/^#source-\d+$/.test(url)?url:''}>{text}</Streamdown>}{streaming && <span className="stream-cursor" aria-hidden="true" />}</div>
    {!streaming && <motion.div initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: .15 }}>
      {referencedSources.some(source=>source.provider!=='Gmail') && <div className="answer-sources">{referencedSources.filter(source=>source.provider!=='Gmail').map(source => <button type="button" className="source-chip" key={source.id} onClick={() => onSource(source)}><SourceLogo provider={source.provider}/><span className="source-title">{sourceTitle(source.title)}</span><ArrowUpRight size={11} /></button>)}</div>}
      <div className="answer-actions"><IconButton aria-label={copied ? 'Answer copied' : 'Copy answer'} onClick={() => { setCopyError(''); void navigator.clipboard.writeText(text).then(() => { setCopied(true); timer.current = setTimeout(() => setCopied(false), 1800) }).catch(() => setCopyError('Could not copy. Select the answer and copy it manually.')) }}>{copied ? <Check /> : <Copy />}</IconButton><IconButton aria-label="Retry response" onClick={onRetry}><RotateCcw /></IconButton><IconButton aria-label="Helpful answer" aria-pressed={feedback === 'up'} onClick={() => setFeedback(feedback === 'up' ? null : 'up')}><ThumbsUp /></IconButton><IconButton aria-label="Unhelpful answer" aria-pressed={feedback === 'down'} onClick={() => setFeedback(feedback === 'down' ? null : 'down')}><ThumbsDown /></IconButton><span className="sr-only" aria-live="polite">{copied ? 'Answer copied.' : feedback ? 'Feedback recorded.' : ''}</span></div>
      {copyError && <p role="alert" className="field-error">{copyError}</p>}
      {followUps.length > 0 && <div className="follow-ups">{followUps.map(question => <button key={question} type="button" onClick={() => onFollowUp(question)}>{question}<ArrowUpRight size={13} /></button>)}</div>}
    </motion.div>}
  </div>
}
