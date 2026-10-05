import type { Activity, Source, ToolCall } from './mock-data'

export type MessageStatus = 'loading' | 'thinking' | 'streaming' | 'complete' | 'stopped' | 'error'
export type Message = { evidence?: boolean; id: string; role: 'user' | 'assistant'; content: string; status: MessageStatus; activities: Activity[]; tools: ToolCall[]; sources: Source[]; followUps: string[]; error?: string }
export type Conversation = { id: string; title: string; messages: Message[]; draft: string; updated: number }
export type ChatEvent =
  | { type: 'mode'; evidence: boolean }
  | { type: 'sources'; sources: Source[] }
  | { type: 'loading'; label: string }
  | { type: 'thinking'; activities: Activity[] }
  | { type: 'tool'; tool: ToolCall }
  | { type: 'delta'; text: string }
  | { type: 'done'; sources: Source[]; followUps: string[] }
  | { type: 'error'; message: string }

export async function readChatStream(response: Response, receive: (event: ChatEvent) => void) {
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(typeof body?.error === 'string' ? body.error : 'The response could not be started. Please try again.')
  }
  if (!response.body) throw new Error('The connection closed before the response started.')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let completed = false
  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      let boundary: number
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        const data = frame.split('\n').filter(line => line.startsWith('data: ')).map(line => line.slice(6)).join('\n')
        if (data) {
          const event = JSON.parse(data) as ChatEvent
          if (event.type === 'done') completed = true
          if (event.type === 'error') throw new Error(event.message)
          receive(event)
        }
      }
      if (done) break
    }
    if (!completed) throw new Error('The connection ended early. You can retry the response.')
  } finally { reader.releaseLock() }
}
