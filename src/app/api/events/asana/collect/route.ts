import { NextRequest, NextResponse } from 'next/server'

interface AsanaTask {
  gid: string
  name: string
  notes?: string
  due_on?: string | null
  start_on?: string | null
  created_at?: string
  custom_fields?: Array<{ gid: string; name: string; type: string; text_value?: string }>
}

function pickDate(task: AsanaTask): string | null {
  return task.due_on || task.start_on || task.created_at || null
}

function normalizeISO(input: string): string {
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return input
  return d.toISOString().split('T')[0]
}

export async function POST(req: NextRequest) {
  try {
    const cookie = req.cookies.get('asana_oauth')?.value
    if (!cookie) {
      return NextResponse.json({ success: false, error: 'Asana not connected' }, { status: 401 })
    }
    const tokenData = JSON.parse(Buffer.from(cookie, 'base64url').toString('utf8'))
    const accessToken: string | undefined = tokenData?.accessToken
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'No Asana access token' }, { status: 401 })
    }

    const { projectId, startDate, endDate, eventFieldName } = await req.json()
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Missing projectId' }, { status: 400 })
    }

    // Fetch tasks in project
    const url = new URL(`https://app.asana.com/api/1.0/projects/${projectId}/tasks`)
    url.searchParams.set(
      'opt_fields',
      [
        'name',
        'notes',
        'due_on',
        'start_on',
        'created_at',
        'custom_fields.name',
        'custom_fields.text_value',
        'custom_fields.enum_value.name',
      ].join(',')
    )
    url.searchParams.set('limit', '100')

    let tasks: AsanaTask[] = []
    let nextPage: string | null = url.toString()
    while (nextPage) {
      const resp = await fetch(nextPage, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (!resp.ok) {
        const text = await resp.text()
        return NextResponse.json({ success: false, error: 'Asana API error', details: text }, { status: 400 })
      }
      const json = await resp.json()
      tasks = tasks.concat(json.data as AsanaTask[])
      nextPage = json?.next_page?.uri || null
    }

    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    const fieldName = ((eventFieldName as string) || 'CW_Panoptic Tracker').trim().toLowerCase()

    const mapped = tasks
      .map((t) => {
        const when = pickDate(t)
        const cf = t.custom_fields?.find((f) => f.name?.trim?.().toLowerCase() === fieldName)
        const typeVal = cf?.text_value || (cf as any)?.enum_value?.name || 'Unknown'
        return {
          date: when ? normalizeISO(when) : '',
          type: typeVal,
          name: t.name,
          description: t.notes || ''
        }
      })
      .filter((r) => r.date && r.name)

    const filteredOutUnknown = mapped.filter(r => String(r.type || '').trim().toLowerCase() === 'unknown').length
    const rows = mapped.filter(r => String(r.type || '').trim().toLowerCase() !== 'unknown')
      .filter((r) => {
        if (!start && !end) return true
        const d = new Date(r.date)
        if (start && d < start) return false
        if (end) {
          const e = new Date(end)
          e.setHours(23, 59, 59, 999)
          if (d > e) return false
        }
        return true
      })

    return NextResponse.json({ 
      success: true, 
      total: rows.length, 
      preview: rows.slice(0, 50),
      filteredOutUnknown,
      startDate: startDate || null,
      endDate: endDate || null,
      note: filteredOutUnknown > 0 ? `Filtered out ${filteredOutUnknown} rows where Type was 'Unknown'.` : undefined
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
}


