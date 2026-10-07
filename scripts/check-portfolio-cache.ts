import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { getPortfolio, clearPortfolioCache } from '../src/server/airtable'

const dir = await mkdtemp('/private/tmp/vitaminc-cache-check-')
process.env.INTEGRATION_STATE_DIRECTORY = dir
process.env.AIRTABLE_API_KEY = 'synthetic-cache-check'
delete process.env.INTEGRATION_BOOTSTRAP_ENCRYPTED
delete process.env.INTEGRATION_BOOTSTRAP_PARTS
const originalFetch = globalThis.fetch
let requests = 0
let active = 0
let peak = 0
try {
  globalThis.fetch = async (input) => {
    assert.match(String(input), /^https:\/\/api.airtable.com\/v0\/appiNFlTS3OLfTkxB\//)
    requests++; active++; peak = Math.max(peak, active)
    await new Promise(resolve => setTimeout(resolve, 10))
    active--
    return Response.json({ records: [] })
  }
  clearPortfolioCache()
  const results = await Promise.all([getPortfolio(), getPortfolio(), getPortfolio()])
  assert.equal(requests, 2, 'Concurrent consumers must share one source refresh')
  assert.equal(peak, 2, 'Company and financial tables must load concurrently')
  assert.equal(results[0], results[1])
  await getPortfolio()
  assert.equal(requests, 2, 'A fresh cache must avoid new Airtable reads')
  await getPortfolio(true)
  assert.equal(requests, 4, 'Explicit Refresh must read current source data')
  process.env.AIRTABLE_API_KEY = 'different-synthetic-connection'
  await getPortfolio()
  assert.equal(requests, 6, 'A changed connection cannot reuse prior source data')
  delete process.env.AIRTABLE_API_KEY
  await assert.rejects(getPortfolio(), /Connect Airtable/)
  console.log('Portfolio cache checks passed: concurrent reads, shared refresh, cached reads, explicit refresh and connection isolation. No external requests.')
} finally {
  globalThis.fetch = originalFetch
  clearPortfolioCache()
  await rm(dir, { recursive: true, force: true })
}
