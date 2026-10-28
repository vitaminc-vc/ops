import React from 'react'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { SourceEvidence } from '../src/components/source-evidence'
import { sourceFieldLabel, structuredSource } from '../src/lib/structured-source'

const portfolio = {
  companyCount: 2, companies: ['Satellites on Fire', 'Rodinia Generation'],
  reportedCapitalEUR: null, companiesReportingCapital: 0,
  companiesWithFinancialReports: 0, sourceWarning: 'Some calculations are unavailable.',
}
const contact = { fetchedAt: '2026-10-27T02:45:00.882Z', values: {
  name: [{ full_name: 'Example Person', first_name: 'Example', attribute_type: 'personal-name' }],
  description: [{ value: 'Exploring a path into VC.', attribute_type: 'text' }],
  email_addresses: [{ email_address: 'example@example.com', email_domain: 'example.com', attribute_type: 'email-address' }],
  company: [], primary_location: [{ country_code: 'CH', locality: null, attribute_type: 'location' }],
  linked_record: [{ target_record_id: 'record-123', attribute_type: 'record-reference' }],
} }
function render(value: unknown, content?: string) {
  return renderToStaticMarkup(<SourceEvidence source={{ id: 'fixture', title: 'Fixture', provider: 'Attio', excerpt: typeof value === 'string' ? value : JSON.stringify(value), content }} />)
}
const portfolioHtml = render(portfolio)
assert.match(portfolioHtml, /Reported capital EUR/)
assert.match(portfolioHtml, /Unreported/)
assert.match(portfolioHtml, /<span>0<\/span>/)
assert.match(portfolioHtml, /<li><span>Satellites on Fire/)
assert.match(portfolioHtml, /Some calculations are unavailable/)
assert.doesNotMatch(portfolioHtml, /&quot;companyCount&quot;/)
const contactHtml = render(contact)
assert.match(contactHtml, /Example Person/)
assert.match(contactHtml, /example@example.com/)
assert.match(contactHtml, /Exploring a path into VC/)
assert.match(contactHtml, /record-123/)
assert.doesNotMatch(contactHtml, /attribute_type|personal-name|email_domain/)
assert.match(render({ enabled: false }), /<span>No<\/span>/)
assert.match(render([{ name: 'One' }, { name: 'Two' }]), /Two/)
assert.match(render('<script>alert(1)</script>'), /&lt;script&gt;/)
assert.match(render({ note: '<img src=x onerror=alert(1)>' }), /&lt;img/)
assert.match(render('fallback', 'Full source\nSecond paragraph'), /Full source\nSecond paragraph/)
assert.equal(structuredSource('{"truncated":'), undefined)
assert.equal(structuredSource('Plain text'), undefined)
assert.equal(sourceFieldLabel('revenueYTD'), 'Revenue YTD')
console.log('Source presentation checks passed')
