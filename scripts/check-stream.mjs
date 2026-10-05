import assert from 'node:assert/strict'

const base = process.argv[2] ?? 'http://127.0.0.1:3000'
const cookie = process.env.VITAMIN_C_TEST_SESSION_COOKIE
if (!cookie) throw new Error('Run npm run check:auth to verify streaming with a temporary authenticated account, or supply VITAMIN_C_TEST_SESSION_COOKIE.')
const headers = { 'Content-Type': 'application/json', origin: base, cookie }
for (const body of ['{}', '{"prompt":""}', '{invalid']) {
  const response = await fetch(`${base}/api/chat`, { method: 'POST', headers, body })
  assert.equal(response.status, 400, 'Malformed and empty questions should fail validation')
}

const response = await fetch(`${base}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ prompt: 'Prepare me for my next call with Cirra', scope: 'All knowledge' }), signal: AbortSignal.timeout(20000) })
assert.equal(response.status, 200)
assert.match(response.headers.get('content-type'), /text\/event-stream/)
const reader = response.body.getReader()
const decoder = new TextDecoder()
const events = []
let buffer = ''
while (true) {
  const { value, done } = await reader.read()
  buffer += decoder.decode(value, { stream: !done })
  let boundary
  while ((boundary = buffer.indexOf('\n\n')) !== -1) {
    const frame = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2)
    if (frame.startsWith('data: ')) events.push(JSON.parse(frame.slice(6)))
  }
  if (done) break
}
assert.equal(events[0].type, 'loading')
assert.equal(events.at(-1).type, 'done')
assert.ok(events.some(event => event.type === 'thinking'))
assert.ok(events.filter(event => event.type === 'delta').length > 10, 'The answer should arrive in multiple chunks')
const text = events.filter(event => event.type === 'delta').map(event => event.text).join('')
assert.match(text, /Cirra/)
assert.match(text, /8\.4%/)
assert.match(text, /18-month runway/)
assert.deepEqual(events.at(-1).sources.map(source => source.provider), ['Gmail', 'Granola', 'Airtable'])
const tools = new Map(events.filter(event => event.type === 'tool').map(event => [event.tool.id, event.tool.status]))
assert.ok([...tools.values()].every(status => status === 'complete'))

const controller = new AbortController()
const interrupted = await fetch(`${base}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ prompt: 'Summarize the portfolio' }), signal: controller.signal })
const interruptedReader = interrupted.body.getReader()
await interruptedReader.read(); controller.abort()
await assert.rejects(() => interruptedReader.read(), { name: 'AbortError' })
assert.equal((await fetch(`${base}/`)).status, 200, 'The server should stay healthy after cancelling a stream')
console.log(`Stream checks passed: validation, incremental events, company facts, source metadata, cancellation, and server health (${events.length} events).`)
