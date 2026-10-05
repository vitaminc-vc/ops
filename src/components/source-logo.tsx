import { FileText } from 'lucide-react'
export function SourceLogo({ provider, className = '' }: { provider: string; className?: string }) {
  const key=provider.toLowerCase()
  const path=key.includes('gmail')?'/logos/gmail-attached.png':key.includes('drive')?'/logos/google-drive.png':key.includes('notion')?'/logos/notion.svg':key.includes('airtable')?'/logos/airtable.svg':key.includes('supermemory')?'/logos/supermemory.ico':key.includes('granola')?'/logos/granola.svg':undefined
  return path?<img src={path} width={18} height={18} alt="" aria-hidden="true" className={`source-logo ${className}`} draggable={false}/>:<FileText className={`source-logo ${className}`} aria-hidden="true"/>
}
