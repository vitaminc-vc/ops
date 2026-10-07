import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { unzipSync, strFromU8 } from 'fflate'

export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024
export type IncomingAttachment = { name: string; mimeType: string; data: string }
export type ParsedAttachment = IncomingAttachment & { text: string; bytes: Buffer; sha256: string }
const xmlText = (xml: string) => xml.replace(/<\/(?:a:p|w:p|w:tr|row)>/g, '\n').replace(/<\/(?:a:t|w:t|c:v|v|t)>/g, ' ').replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

export async function parseAttachment(input: IncomingAttachment): Promise<ParsedAttachment> {
  if (!input || typeof input.name !== 'string' || input.name.length > 250 || typeof input.data !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(input.data)) throw Error('unreadable_attachment')
  const bytes = Buffer.from(input.data, 'base64')
  if (!bytes.length || bytes.length > MAX_ATTACHMENT_BYTES || bytes.toString('base64') !== input.data) throw Error('attachment_size_or_encoding')
  let text = ''
  const extension = input.name.split('.').pop()?.toLowerCase()
  if (extension === 'pdf' && bytes.subarray(0, 5).toString() === '%PDF-') {
    const { PDFParse } = await import('pdf-parse')
    if (process.env.NODE_ENV === 'production') PDFParse.setWorker(pathToFileURL(resolve('.output/server/_libs/pdf.worker.mjs')).href)
    const parser = new PDFParse({ data: new Uint8Array(bytes), isEvalSupported: false })
    try {
      const info = await parser.getInfo()
      if (info.total > 150) throw Error('attachment_too_long')
      text = (await parser.getText()).text
    } finally { await parser.destroy() }
  } else if (['pptx', 'docx'].includes(extension || '') && bytes.subarray(0, 2).toString() === 'PK') {
    let expanded = 0, entries = 0
    const checkSize = (file: { originalSize: number }) => {
      expanded += file.originalSize
      if (file.originalSize > 2_000_000 || expanded > 10_000_000) throw Error('archive_too_large')
    }
    const files = unzipSync(new Uint8Array(bytes), { filter(file) {
      if (++entries > 3000) throw Error('archive_too_large')
      if (file.name.endsWith('/')) return false
      if (/vbaProject/i.test(file.name)) throw Error('embedded_attachment_needs_review')
      const workbook = /^(ppt|word)\/embeddings\/.*\.xlsx$/i.test(file.name)
      if (/\/embeddings\//i.test(file.name) && !workbook) throw Error('embedded_attachment_needs_review')
      const include = workbook || /^(ppt\/(?:slides|notesSlides|comments|charts)\/.*\.xml|word\/(?:(?:document|footnotes|endnotes|comments|header\d*|footer\d*)\.xml|charts\/.*\.xml))$/.test(file.name)
      if (include) checkSize(file)
      return include
    } })
    text = Object.entries(files).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([name, value]) => {
      if (!name.endsWith('.xlsx')) return xmlText(strFromU8(value))
      // Native Office charts often carry an embedded workbook. Inspect its full
      // XML too, including hidden sheets and comments, under the shared budget.
      const workbook = unzipSync(value, { filter(file) {
        if (++entries > 3000) throw Error('archive_too_large')
        if (file.name.endsWith('/')) return false
        if (/vbaProject|\/embeddings\//i.test(file.name)) throw Error('embedded_attachment_needs_review')
        const include = /^xl\/.*\.xml$/.test(file.name)
        if (include) checkSize(file)
        return include
      } })
      return Object.values(workbook).map(value => xmlText(strFromU8(value))).join('\n')
    }).join('\n\n')
  } else if (['txt', 'csv', 'md'].includes(extension || '')) {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } else throw Error('unsupported_attachment')
  if (text.trim().length < 20 || text.length > 100_000) throw Error('attachment_needs_review')
  return { ...input, text: text.trim(), bytes, sha256: createHash('sha256').update(bytes).digest('hex') }
}
