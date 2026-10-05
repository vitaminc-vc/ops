export function sourceTitle(title: string) {
  return title.replace(/^\s*\[(?:Vitamin-C\s+)?ingestion\s+test\]\s*/i, '').replace(/^\s*\[test\]\s*/i, '').trim() || 'Email'
}
export function senderIdentity(from = '') {
  const address = from.match(/<([^<>]+)>/)?.[1] || (/^[^\s@]+@[^\s@]+$/.test(from.trim()) ? from.trim() : '')
  const name = from.replace(/<[^<>]+>/g, '').replace(/^\s*["']|["']\s*$/g, '').trim()
  return { name: name && name !== address ? name : address.split('@')[0] || 'Sender', address }
}
const entities: Record<string,string> = { amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',hellip:'…',bull:'•',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“',euro:'€',copy:'©' }
function decodeEntities(text: string) {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(original,entity:string)=>{
    if(entity.startsWith('#')) {
      const code=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):parseInt(entity.slice(1),10)
      return code>0 && code<=0x10ffff && !(code>=0xd800 && code<=0xdfff)?String.fromCodePoint(code):original
    }
    return entities[entity.toLowerCase()] ?? original
  })
}
export function emailBody(content: string) {
  // Preserve the complete message's wording; only normalize its presentation.
  // Plain text means scripts, tracking pixels, and remote email images cannot render.
  let body=content.replace(/\r\n?/g,'\n').replace(/^\s*Email subject:[\s\S]*?\bMailbox:\s*[^\s]+(?:\s+|$)/i,'')
  if(/<\/?(?:html|body|div|p|br|span|table|a)\b/i.test(body)) body=body
    .replace(/<!--[^]*?-->/g,'')
    .replace(/<(script|style|head)\b[^>]*>[\s\S]*?<\/\1>/gi,'')
    .replace(/<br\s*\/?\s*>/gi,'\n')
    .replace(/<\/(?:p|div|tr|h[1-6])\s*>/gi,'\n\n')
    .replace(/<li\b[^>]*>/gi,'\n• ')
    .replace(/<\/?[a-z][^>]*>/gi,'')
  const readable=decodeEntities(body.replace(/\[image:[^\]]*\]/gi,'')
    .replace(/<(https?:\/\/[^>]+)>/g,'')
    .replace(/https?:\/\/\S{100,}/g,'')
    .replace(/\*([^*]+)\*/g,'$1'))
    .replace(/\s*(Commercial and operating update|Fundraising and request)\s*/g,'\n\n$1\n\n')
    .replace(/^[ \t]*- /gm,'• ').replace(/ +\- (?=[A-Z])/g,'\n• ')
    .replace(/^(Hi [^,\n]+,)\s*/,'$1\n\n').replace(/\s+Best,\s*/,'\n\nBest,\n')
    .replace(/\n{3,}/g,'\n\n').trim()
  // Undo email transport's soft line wrapping while retaining paragraphs and lists.
  return readable.split(/\n\n/).map(paragraph=>/^Best,\n/.test(paragraph)?paragraph.trim():paragraph.replace(/\n(?![•>])/g,' ').replace(/[ \t]+/g,' ').trim()).join('\n\n')
}
export const isSampleEmail=(text:string)=>/VC-EMAIL-20260930-EMBERGRID/i.test(text)
