import { timingSafeEqual } from 'node:crypto'
export function requireIngestionService(request: Request) {
  const expected = process.env.INGESTION_API_KEY || ''
  const actual = request.headers.get('authorization')?.replace(/^Bearer /, '') || ''
  const a=Buffer.from(actual),b=Buffer.from(expected)
  return expected.length >= 32 && a.length === b.length && timingSafeEqual(a,b)
}
