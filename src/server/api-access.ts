import { getWorkspaceUser } from './auth'
import { authEnvironment } from './env'

export async function requireAdmin(request: Request, mutate = false) {
  if (mutate && !authEnvironment().trustedOrigins.includes(request.headers.get('origin') || '')) return Response.json({ error: 'Invalid request origin.' }, { status: 403 })
  const user = await getWorkspaceUser(request.headers)
  if (!user) return Response.json({ error: 'Sign in to continue.' }, { status: 401 })
  if (user.role !== 'admin') return Response.json({ error: 'Admin access is required.' }, { status: 403 })
  return user
}
export async function limitedJSON(request: Request, limit = 250_000) {
  if (Number(request.headers.get('content-length')) > limit) throw Error('Request is too large.')
  const reader=request.body?.getReader();if(!reader)throw Error('Invalid request.')
  const chunks:Uint8Array[]=[];let bytes=0
  try {while(true){const item=await reader.read();if(item.done)break;bytes+=item.value.length;if(bytes>limit){await reader.cancel();throw Error('Request is too large.')}chunks.push(item.value)}}finally{reader.releaseLock()}
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string,unknown>
}
export const privateJSON = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
