import React from 'react'
import { FileText } from 'lucide-react'
import type { Source } from '../lib/mock-data'
import { sourceFieldLabel, structuredSource, type SourceValue } from '../lib/structured-source'

function FieldValue({ value }: { value: SourceValue }) {
  if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) return <span className="source-unreported">Unreported</span>
  if (Array.isArray(value)) return value.length === 1 ? <FieldValue value={value[0]} /> : <ul className="source-value-list">{value.map((item, index) => <li key={index}><FieldValue value={item} /></li>)}</ul>
  if (typeof value === 'object') {
    const entries = Object.entries(value)
    return entries.length ? <dl className="source-fields">{entries.map(([key, item]) => <div className="source-field" key={key}><dt>{key === 'values' ? 'Record details' : sourceFieldLabel(key)}</dt><dd><FieldValue value={item} /></dd></div>)}</dl> : <span className="source-unreported">Unreported</span>
  }
  return <span>{typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value)}</span>
}

export function SourceEvidence({ source }: { source: Source }) {
  const text = source.content || source.excerpt
  const structured = structuredSource(text)
  return <div className="source-excerpt"><FileText size={20} aria-hidden="true" />{structured === undefined ? <p>{text}</p> : <div className="source-record"><FieldValue value={structured} /></div>}</div>
}
