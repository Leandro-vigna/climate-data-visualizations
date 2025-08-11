import { NextRequest, NextResponse } from 'next/server'

interface AsanaEventRow {
  date: string
  type: string
  name: string
  description: string
}

function normalizeDate(input: string): string {
  const d = new Date(input)
  if (isNaN(d.getTime())) return input
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseCsv(csv: string): AsanaEventRow[] {
  const lines = csv.split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return []
  const header = lines[0].split(',').map(h => h.trim().toLowerCase())
  const dateIdx = header.findIndex(h => ['date', 'due date', 'start date'].includes(h))
  const typeIdx = header.findIndex(h => h.includes('cw_panoptic') || h.includes('tracker') || h === 'type')
  const nameIdx = header.findIndex(h => ['name', 'task name', 'task'].includes(h))
  const descIdx = header.findIndex(h => ['description', 'notes', 'details'].includes(h))
  const out: AsanaEventRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',')
    if (parts.length === 0) continue
    const row: AsanaEventRow = {
      date: normalizeDate(parts[dateIdx] || ''),
      type: (parts[typeIdx] || '').trim(),
      name: (parts[nameIdx] || '').trim(),
      description: (parts[descIdx] || '').trim(),
    }
    if (row.date && row.type && row.name) out.push(row)
  }
  return out
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url, csvContent } = body

    let rows: AsanaEventRow[] = []

    if (csvContent && typeof csvContent === 'string') {
      rows = parseCsv(csvContent)
    } else if (url && typeof url === 'string') {
      const resp = await fetch(url)
      if (!resp.ok) {
        return NextResponse.json({ success: false, error: 'Failed to fetch Asana export' }, { status: 400 })
      }
      const text = await resp.text()
      rows = parseCsv(text)
    } else {
      return NextResponse.json({ success: false, error: 'Provide a public CSV link or upload content' }, { status: 400 })
    }

    // Return preview limited to 50 rows
    return NextResponse.json({ success: true, total: rows.length, preview: rows.slice(0, 50) })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
}


