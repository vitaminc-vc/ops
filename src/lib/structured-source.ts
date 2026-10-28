export type SourceValue = string | number | boolean | null | SourceValue[] | { [key: string]: SourceValue }

export function sourceFieldLabel(key: string) {
  return key.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').replace(/([a-z\d])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase()
    .replace(/\b(?:eur|usd|arr|ytd|id|url)\b/gi, word => word.toUpperCase())
    .replace(/^./, letter => letter.toUpperCase())
}

function normalize(value: SourceValue, attio = false): SourceValue {
  if (Array.isArray(value)) return value.map(item => normalize(item, attio))
  if (!value || typeof value !== 'object') return value
  // Attio stores each attribute in an array of typed values. Remove transport
  // wrappers, while retaining unknown fields (including linked-record IDs).
  if (attio && typeof value.attribute_type === 'string') {
    if ('value' in value) return normalize(value.value, attio)
    if (typeof value.full_name === 'string') return value.full_name
    if (typeof value.email_address === 'string') return value.email_address
  }
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !attio || key !== 'attribute_type')
    .map(([key, item]) => [key, normalize(item, attio)]))
}

export function structuredSource(text: string): SourceValue | undefined {
  try {
    const value: SourceValue = JSON.parse(text)
    if (!value || typeof value !== 'object') return undefined
    if (!Array.isArray(value) && value.values && typeof value.values === 'object' && !Array.isArray(value.values)) {
      // Keep fetch metadata separate from the contact's attributes.
      return normalize({ ...value, values: normalize(value.values, true) })
    }
    return normalize(value)
  } catch {
    // Excerpts can be truncated JSON; preserve them instead of failing the modal.
    return undefined
  }
}
