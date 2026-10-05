/** Small RFC 4180 reader for local list imports, including quoted commas and newlines. */
export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++ } else quoted = !quoted }
    else if (c === ',' && !quoted) { row.push(field.trim()); field = '' }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field.trim()); if (row.some(Boolean)) rows.push(row); row = []; field = '' }
    else field += c
  }
  if (quoted) throw new Error('The CSV has an unclosed quoted field.')
  row.push(field.trim()); if (row.some(Boolean)) rows.push(row)
  const headers = rows.shift()?.map(h => h.replace(/^\uFEFF/, '').toLowerCase()) ?? []
  if (!headers.includes('name')) throw new Error('Include a “name” column in your CSV.')
  return rows.slice(0, 500).map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))).filter(record => record.name)
}
