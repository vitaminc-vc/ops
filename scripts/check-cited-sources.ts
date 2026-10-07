import assert from 'node:assert/strict'
import { citedSources } from '../src/lib/source-presentation'
import type { Source } from '../src/lib/mock-data'
const sources: Source[] = [
  { id:'airtable',title:'Earlier company record',provider:'Airtable',excerpt:'Portfolio' },
  { id:'email',title:'Founder update',provider:'Gmail',excerpt:'Email' },
]
assert.deepEqual(citedSources('Founder facts. [2]',sources).map(s=>s.id),['email'])
assert.deepEqual(citedSources('Both sources. [2] [1] [2]',sources).map(s=>s.id),['airtable','email'])
assert.deepEqual(citedSources('No references in this answer.',sources),[])
assert.deepEqual(citedSources('Invalid [0] [3]. Code `[1]` and ```\n[2]\n```',sources),[])
console.log('Cited-source checks passed: unused sources hidden, original citation mapping retained, repeated references deduplicated, invalid/code references ignored.')
