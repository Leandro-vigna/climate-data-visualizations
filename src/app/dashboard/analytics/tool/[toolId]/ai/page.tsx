'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Download, LineChart, Send, Zap, X } from 'lucide-react'

interface UnifiedRow {
  date: string
  metric_type: string
  dimension_type: string
  dimension_value: string
  metric_value: number
  landing_page?: string
  source?: string
  medium?: string
  event_type?: string
  event_name?: string
  description?: string
}

interface ChartPoint { date: string; value: number }
interface ChartEvent { date: string; label: string }
interface ChartData { series: ChartPoint[]; events: ChartEvent[]; metricLabel: string }

function buildChartData(rows: UnifiedRow[]): ChartData {
  const metricSynonyms: Array<{ label: string; names: string[] }> = [
    { label: 'pageviews', names: ['pageviews', 'screenpageviews', 'screen_page_views', 'views', 'page_views'] },
    { label: 'sessions', names: ['sessions', 'session'] },
    { label: 'users', names: ['users', 'activeusers', 'active_users', 'active_users_total'] },
  ]

  let chosenLabel = 'pageviews'
  let chosenNames = metricSynonyms[0].names
  for (const group of metricSynonyms) {
    if (rows.some(r => group.names.includes(String(r.metric_type).toLowerCase().trim()))) {
      chosenLabel = group.label
      chosenNames = group.names
      break
    }
  }
  // Fallback: pick the most common non-event metric in the dataset
  if (!rows.some(r => chosenNames.includes(String(r.metric_type).toLowerCase().trim()))) {
    const counts: Record<string, number> = {}
    rows.forEach(r => {
      const mt = String(r.metric_type).toLowerCase().trim()
      if (mt && mt !== 'events') { counts[mt] = (counts[mt] || 0) + 1 }
    })
    let maxK = Object.keys(counts)[0]
    let maxV = maxK ? counts[maxK] : 0
    Object.entries(counts).forEach(([k, v]) => { if (v > maxV) { maxK = k; maxV = v } })
    if (maxK) { chosenLabel = maxK; chosenNames = [maxK] }
  }

  const byDate: Record<string, number> = {}
  const datesSet = new Set<string>()
  rows.forEach(r => {
    if (chosenNames.includes(String(r.metric_type).toLowerCase().trim())) {
      const d = r.date
      datesSet.add(d)
      const val = Number(r.metric_value)
      byDate[d] = (byDate[d] || 0) + (isFinite(val) ? val : 0)
    }
  })
  const dates = Array.from(datesSet).filter(Boolean).sort()
  const series: ChartPoint[] = dates.map(d => ({ date: d, value: byDate[d] || 0 }))
  const events: ChartEvent[] = rows
    .filter(r => String(r.metric_type) === 'events')
    .map(r => ({ date: r.date, label: r.event_type ? String(r.event_type) : (r.event_name || 'event') }))
  if (series.length === 0) {
    // Fallback: aggregate all non-event metrics by date
    const agg: Record<string, number> = {}
    rows.forEach(r => {
      const mt = String(r.metric_type).toLowerCase().trim()
      if (mt && mt !== 'events') {
        const val = Number(r.metric_value)
        if (isFinite(val)) {
          agg[r.date] = (agg[r.date] || 0) + val
        }
      }
    })
    const ds = Object.keys(agg).filter(Boolean).sort()
    const s2: ChartPoint[] = ds.map(d => ({ date: d, value: agg[d] }))
    return { series: s2, events, metricLabel: 'all metrics' }
  }
  return { series, events, metricLabel: chosenLabel }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderBasicMarkdown(md: string): string {
  if (!md) return ''
  let s = escapeHtml(md)
  // Bold and italics
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // Headings (convert to bold lines)
  s = s.replace(/^##\s+(.+)$/gm, '<strong>$1</strong>')
  s = s.replace(/^###\s+(.+)$/gm, '<strong>$1</strong>')
  // Lists
  const lines = s.split(/\n/)
  const out: string[] = []
  let inList = false
  for (const line of lines) {
    const m = line.match(/^\s*(?:[-*])\s+(.+)/)
    if (m) {
      if (!inList) { out.push('<ul>'); inList = true }
      out.push(`<li>${m[1]}</li>`)
    } else {
      if (inList) { out.push('</ul>'); inList = false }
      if (line.trim() === '') { out.push('<br/>') }
      else { out.push(`<p>${line}</p>`) }
    }
  }
  if (inList) out.push('</ul>')
  return out.join('\n')
}

function MiniTimeSeriesChart({ data }: { data: ChartData }) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const width = 800
  const height = 260
  const padding = { top: 16, right: 14, bottom: 28, left: 40 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const series = data.series
  if (!series.length) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <div className="flex items-center"><LineChart className="w-4 h-4 mr-2"/>No data for selected range</div>
      </div>
    )
  }

  function movingAverage(points: ChartPoint[], windowSize: number): ChartPoint[] {
    const result: ChartPoint[] = []
    let sum = 0
    const values: number[] = []
    for (let i = 0; i < points.length; i++) {
      const v = points[i].value
      values.push(v)
      sum += v
      if (values.length > windowSize) {
        sum -= values.shift() as number
      }
      const avg = sum / values.length
      result.push({ date: points[i].date, value: avg })
    }
    return result
  }

  const yMax = Math.max(1, ...series.map(p => p.value))
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => t * yMax)
  const formatNumber = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}k` : `${Math.round(n)}`

  const getX = (i: number) => padding.left + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW)
  const getY = (v: number) => padding.top + innerH - (v / yMax) * innerH

  const linePoints = series.map((p, i) => `${getX(i)},${getY(p.value)}`).join(' ')
  const avg7 = movingAverage(series, 7)
  const avgPoints = avg7.map((p, i) => `${getX(i)},${getY(p.value)}`).join(' ')

  const dateIndex: Record<string, number> = {}
  series.forEach((p, i) => { dateIndex[p.date] = i })
  // Downsample events to avoid clutter (max 12 markers, evenly spread by date)
  const uniqueEventDates = Array.from(new Set(data.events.map(e => e.date))).sort()
  const maxMarkers = 12
  const stepEvents = Math.max(1, Math.ceil(uniqueEventDates.length / maxMarkers))
  const sampledEventDates = uniqueEventDates.filter((_, idx) => idx % stepEvents === 0).slice(0, maxMarkers)
  const eventMarkers = sampledEventDates
    .map(d => ({
      idx: dateIndex[d],
      date: d,
      label: (data.events.find(e => e.date === d)?.label) || 'event'
    }))
    .filter(m => typeof m.idx === 'number' && !isNaN(m.idx as number))
    .map(m => ({ x: getX(m.idx as number), date: m.date, label: m.label }))

  const xTickCount = Math.min(8, Math.max(3, Math.floor(innerW / 90)))
  const step = Math.max(1, Math.floor((series.length - 1) / xTickCount))
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return `${months[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`
  }

  // Year change markers
  const yearBoundaries: Array<{ idx: number; year: number }> = []
  for (let i = 1; i < series.length; i++) {
    const prev = new Date(series[i - 1].date)
    const curr = new Date(series[i].date)
    if (prev.getUTCFullYear() !== curr.getUTCFullYear()) {
      yearBoundaries.push({ idx: i, year: curr.getUTCFullYear() })
    }
  }

  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null)
  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svgEl = svgRef.current
    if (!svgEl) return
    const pt = (svgEl as any).createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const cursor = pt.matrixTransform((svgEl as any).getScreenCTM().inverse())
    const x = cursor.x
    const ratio = Math.min(1, Math.max(0, (x - padding.left) / innerW))
    const i = Math.round(ratio * (series.length - 1))
    const clampedI = Math.min(series.length - 1, Math.max(0, i))
    setHover({ i: clampedI, x: getX(clampedI), y: getY(series[clampedI].value) })
    // Event hover detection
    let nearest: { x: number; date: string; label: string } | null = null
    let best = Infinity
    for (const m of eventMarkers) {
      const dist = Math.abs(m.x - x)
      if (dist < best && dist < 8) { best = dist; nearest = m }
    }
    ;(window as any)._aiw_eventHover = nearest
  }

  const fmtFullDate = (iso: string) => {
    const d = new Date(iso)
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-64 bg-white rounded border"
      onMouseMove={onMouseMove}
      onMouseLeave={() => setHover(null)}
    >
      <rect x={0} y={0} width={width} height={height} fill="white"/>
      {/* Gridlines */}
      {yTicks.map((t, idx) => (
        <g key={idx}>
          <line x1={padding.left} y1={getY(t)} x2={padding.left + innerW} y2={getY(t)} stroke="#eef2f7" />
          <text x={padding.left - 6} y={getY(t) + 3} fontSize="10" fill="#9ca3af" textAnchor="end">{formatNumber(t)}</text>
        </g>
      ))}
      {Array.from({ length: xTickCount + 1 }).map((_, k) => {
        const i = Math.min(series.length - 1, k * step)
        const x = getX(i)
        return (
          <g key={k}>
            <line x1={x} y1={padding.top} x2={x} y2={padding.top + innerH} stroke="#f1f5f9" />
            <text x={x} y={padding.top + innerH + 14} fontSize="10" fill="#9ca3af" textAnchor="middle">{fmtDate(series[i].date)}</text>
          </g>
        )
      })}

      {/* Series */}
      <polyline fill="none" stroke="#6366f1" strokeWidth={1.6} points={linePoints}/>
      {/* 7-day avg */}
      <polyline fill="none" stroke="#ef4444" strokeWidth={2.2} points={avgPoints} opacity={0.9}/>

      {/* Year boundaries */}
      {yearBoundaries.map((b, i) => (
        <g key={i}>
          <line x1={getX(b.idx)} x2={getX(b.idx)} y1={padding.top} y2={padding.top + innerH} stroke="#64748b" strokeDasharray="6 2" strokeWidth={1.5} />
          <text x={getX(b.idx) + 4} y={padding.top + 12} fontSize="10" fill="#64748b">{b.year}</text>
        </g>
      ))}

      {/* Sampled event markers */}
      {eventMarkers.map((m, i) => (
        <g key={i}>
          <line x1={m.x} x2={m.x} y1={padding.top} y2={padding.top + 8} stroke="#f59e0b" strokeWidth={2} />
          <circle cx={m.x} cy={padding.top + 6} r={2.5} fill="#f59e0b" />
        </g>
      ))}

      {/* Hover */}
      {hover && (
        <g>
          <line x1={hover.x} x2={hover.x} y1={padding.top} y2={padding.top + innerH} stroke="#94a3b8" strokeDasharray="2 2" />
          <circle cx={hover.x} cy={hover.y} r={3.5} fill="#6366f1" stroke="#fff" strokeWidth={1} />
          <rect x={Math.min(hover.x + 8, padding.left + innerW - 140)} y={padding.top + 8} width={132} height={46} rx={4} fill="#111827" opacity={0.9}/>
          <text x={Math.min(hover.x + 14, padding.left + innerW - 134)} y={padding.top + 24} fontSize="11" fill="#fff">{fmtFullDate(series[hover.i].date)}</text>
          <text x={Math.min(hover.x + 14, padding.left + innerW - 134)} y={padding.top + 40} fontSize="12" fill="#fff" fontWeight={600}>{formatNumber(series[hover.i].value)}</text>
        </g>
      )}

      {/* Event tooltip */}
      {((window as any)._aiw_eventHover) && (
        <g>
          <rect x={Math.min(((window as any)._aiw_eventHover.x) + 8, padding.left + innerW - 170)} y={padding.top + 56} width={160} height={40} rx={4} fill="#1f2937" opacity={0.92}/>
          <text x={Math.min(((window as any)._aiw_eventHover.x) + 14, padding.left + innerW - 166)} y={padding.top + 72} fontSize="11" fill="#fff">{fmtFullDate(((window as any)._aiw_eventHover.date))}</text>
          <text x={Math.min(((window as any)._aiw_eventHover.x) + 14, padding.left + innerW - 166)} y={padding.top + 86} fontSize="11" fill="#fff">{((window as any)._aiw_eventHover.label)}</text>
        </g>
      )}

      {/* Legend & label */}
      <text x={padding.left} y={padding.top - 4} fontSize="10" fill="#6b7280">{data.metricLabel}</text>
      <g>
        <rect x={padding.left + 80} y={padding.top - 12} width={180} height={12} fill="transparent"/>
        <circle cx={padding.left + 90} cy={padding.top - 8} r={3} fill="#ef4444"/>
        <text x={padding.left + 98} y={padding.top - 5} fontSize="10" fill="#6b7280">7d avg</text>
        <circle cx={padding.left + 140} cy={padding.top - 8} r={3} fill="#6366f1"/>
        <text x={padding.left + 148} y={padding.top - 5} fontSize="10" fill="#6b7280">daily</text>
      </g>
    </svg>
  )
}

function convertToUnified(rows: any[]): UnifiedRow[] {
  const out: UnifiedRow[] = []
  rows.forEach((r: any) => {
    // Already unified
    if (r && r.date && r.metric_type && r.dimension_type && r.dimension_value !== undefined && r.metric_value !== undefined) {
      out.push({
        date: String(r.date),
        metric_type: String(r.metric_type),
        dimension_type: String(r.dimension_type),
        dimension_value: String(r.dimension_value),
        metric_value: Number(r.metric_value) || 0,
        landing_page: r.landing_page,
        source: r.source,
        medium: r.medium,
        event_type: r.event_type,
        event_name: r.event_name,
        description: r.description,
      })
      return
    }
    // Geographic (users by country)
    if (r && r.country !== undefined) {
      out.push({
        date: String(r.date || ''),
        metric_type: 'users',
        dimension_type: 'country',
        dimension_value: String(r.country),
        metric_value: Number(r.activeUsers || 0)
      })
      return
    }
    // Landing pages with source/medium
    if (r && r.landingPage !== undefined) {
      out.push({
        date: String(r.date || ''),
        metric_type: 'sessions',
        dimension_type: 'landing_page_traffic',
        dimension_value: `${r.landingPage} | ${r.source || ''}/${r.medium || ''}`,
        metric_value: Number(r.sessions || 0),
        landing_page: r.landingPage,
        source: r.source,
        medium: r.medium
      })
      return
    }
    // Pageviews
    if (r && r.page !== undefined) {
      out.push({
        date: String(r.date || ''),
        metric_type: 'pageviews',
        dimension_type: 'page',
        dimension_value: String(r.page),
        metric_value: Number(r.pageViews || 0)
      })
      return
    }
    // Events (CW_Panoptic etc.)
    if (r && (r.name !== undefined || r.event_name !== undefined)) {
      out.push({
        date: String(r.date || ''),
        metric_type: 'events',
        dimension_type: String(r.type || r.event_type || 'event'),
        dimension_value: String(r.name || r.event_name || ''),
        metric_value: 1,
        event_type: r.type || r.event_type,
        event_name: r.name || r.event_name,
        description: r.description || ''
      })
      return
    }
  })
  return out
}

export default function AIWizardPage() {
  const params = useParams()
  const router = useRouter()
  const toolId = params.toolId as string

  const [master, setMaster] = useState<UnifiedRow[]>([])
  const [dateStart, setDateStart] = useState<string>('')
  const [dateEnd, setDateEnd] = useState<string>('')
  const [question, setQuestion] = useState('What changed in our pageviews recently and why?')
  const [threads, setThreads] = useState<Array<{ id: string; question: string; answer?: string; chart?: ChartData; contextNote?: string }>>([])
  const [isAsking, setIsAsking] = useState(false)
  // Use a valid default that always exists server-side
  const [model, setModel] = useState<string>('gpt-4o')
  const [contextMode, setContextMode] = useState<'compact' | 'detailed'>('compact')
  const [loadError, setLoadError] = useState<string>('')
  const [anthropicAvailable, setAnthropicAvailable] = useState<boolean>(false)
  const [groqAvailable, setGroqAvailable] = useState<boolean>(false)

  function normalizeToISO(dateStr: string): string {
    if (!dateStr) return ''
    // YYYYMMDD
    if (/^\d{8}$/.test(dateStr)) {
      const y = parseInt(dateStr.slice(0, 4))
      const m = parseInt(dateStr.slice(4, 6)) - 1
      const d = parseInt(dateStr.slice(6, 8))
      const dt = new Date(Date.UTC(y, m, d))
      return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
    }
    // YYYY-M-D or ISO
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
      const [yy, mm, dd] = dateStr.split('-').map((p) => parseInt(p))
      const dt = new Date(Date.UTC(yy, mm - 1, dd))
      return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
    }
    const dt = new Date(dateStr)
    if (isNaN(dt.getTime())) return ''
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
  }

  function ensureISO(dateStr: string): string {
    if (!dateStr) return ''
    // already ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
    return normalizeToISO(dateStr)
  }

  function buildAggregatedContext(rows: UnifiedRow[]): { csv: string; note: string } {
    const norm = (s: string) => String(s || '').toLowerCase().replace(/\s+/g, '_')
    const isMetric = (r: UnifiedRow, target: string[]) => target.includes(norm(r.metric_type))

    // Discover all metric types first
    const allMetricTypes = new Set<string>()
    rows.forEach(r => {
      const mt = norm(r.metric_type)
      if (mt && mt !== 'events') allMetricTypes.add(mt)
    })

    // Define known metric groups and add any unknowns
    const metricGroups: Record<string, string[]> = {
      pageviews: ['pageviews', 'screenpageviews', 'screen_page_views', 'views', 'page_views'],
      sessions: ['sessions', 'session'],
      users: ['users', 'activeusers', 'active_users', 'active_users_total'],
      downloads: ['downloads', 'download', 'file_downloads']
    }

    // Add any unrecognized metrics as their own group
    for (const mt of Array.from(allMetricTypes)) {
      const isKnown = Object.values(metricGroups).some(group => group.includes(mt))
      if (!isKnown) {
        metricGroups[mt] = [mt]
      }
    }

    const groupKeys = Object.keys(metricGroups)
    const byDate: Record<string, Record<string, number>> = {}
    const dimensionCounts: Record<string, Record<string, number>> = {}

    for (const r of rows) {
      const d = ensureISO(r.date)
      if (!d) continue
      if (!byDate[d]) {
        byDate[d] = {}
        groupKeys.forEach(key => { byDate[d][key] = 0 })
        byDate[d].events = 0
      }
      
      const val = Number(r.metric_value)
      if (isFinite(val)) {
        // Find which group this metric belongs to
        let assigned = false
        for (const [groupKey, groupMetrics] of Object.entries(metricGroups)) {
          if (isMetric(r, groupMetrics)) {
            byDate[d][groupKey] += val
            assigned = true
            
            // Track top items for this group
            if (!dimensionCounts[groupKey]) dimensionCounts[groupKey] = {}
            if (r.dimension_value) {
              const key = r.dimension_type === 'landing_page_traffic' && r.landing_page 
                ? r.landing_page 
                : r.dimension_value
              dimensionCounts[groupKey][key] = (dimensionCounts[groupKey][key] || 0) + val
            }
            break
          }
        }
      }
      
      if (String(r.metric_type) === 'events') {
        byDate[d].events += 1
      }
    }

    const dates = Object.keys(byDate).sort()
    const header = ['date', ...groupKeys, 'events']
    const dataLines = dates.map(d => {
      const row = [d]
      groupKeys.forEach(key => row.push(String(byDate[d][key] || 0)))
      row.push(String(byDate[d].events || 0))
      return row.join(',')
    })
    const csv = [header.join(','), ...dataLines].join('\n')

    function topN(map: Record<string, number>, n = 10): string {
      return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([k, v]) => `${k} | ${v}`)
        .join('\n')
    }

    const noteLines: string[] = []
    for (const [groupKey, counts] of Object.entries(dimensionCounts)) {
      if (Object.keys(counts).length > 0) {
        noteLines.push(`Top ${groupKey}:`)
        noteLines.push(topN(counts, 8))
        noteLines.push('')
      }
    }
    
    return { csv, note: noteLines.join('\n') }
  }

  // Load master spreadsheet data from collections API (already merged)
  useEffect(() => {
    async function load() {
      setLoadError('')
      // detect available providers to avoid useless fallbacks
      try {
        const envResp = await fetch('/api/test-env')
        const envJson = await envResp.json().catch(() => null)
        setAnthropicAvailable(Boolean(envJson?.ANTHROPIC_API_KEY_PRESENT))
        setGroqAvailable(Boolean(envJson?.GROQ_API_KEY_PRESENT))
      } catch {}
      const resp = await fetch('/api/analytics/collections')
      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        const isSleeping = resp.status === 503 || /currently not running/i.test(text)
        setLoadError(isSleeping ? 'Server is waking up (503). Please wait a few seconds and refresh.' : `Failed to load collections (${resp.status}).`)
        return
      }
      const json = await resp.json().catch(() => null)
      if (!json?.success) {
        setLoadError('Failed to load collections.')
        return
      }
      // Flatten all collections unified rows
      const rawRows: any[] = []
      ;(json.collections || []).forEach((c: any) => {
        if (Array.isArray(c.data)) {
          c.data.forEach((r: any) => rawRows.push(r))
        }
      })
      const unified = convertToUnified(rawRows)
      // Normalize dates to ISO for inputs/filters
      const normalized = unified.map(r => ({ ...r, date: normalizeToISO(r.date) }))
      setMaster(normalized)
      // Default date range based on merged data
      const dates = Array.from(new Set(normalized.map(r => ensureISO(r.date)))).filter(Boolean).sort()
      if (dates.length) {
        setDateStart(ensureISO(dates[0]))
        setDateEnd(ensureISO(dates[dates.length - 1]))
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!master.length || !dateStart || !dateEnd) return [] as UnifiedRow[]
    const start = new Date(ensureISO(dateStart) + 'T00:00:00Z')
    const end = new Date(ensureISO(dateEnd) + 'T23:59:59Z')
    end.setHours(23, 59, 59, 999)
    return master.filter(r => {
      const d = new Date((ensureISO(r.date) || '') + 'T00:00:00Z')
      return d >= start && d <= end
    })
  }, [master, dateStart, dateEnd])

  // Compute simple coverage overview like the Data Coverage Timeline header
  const coverage = useMemo(() => {
    const byType: Record<string, { count: number; dates: string[] }> = {}
    filtered.forEach(r => {
      const key = r.metric_type === 'events' ? 'events' : r.metric_type === 'pageviews' ? 'pageviews' : r.metric_type
      if (!byType[key]) byType[key] = { count: 0, dates: [] }
      byType[key].count += 1
      byType[key].dates.push(r.date)
    })
    return byType
  }, [filtered])

  async function askAI() {
    if (!question.trim()) return
    setIsAsking(true)

    // Prepare context (compact or detailed)
    const isGroq = model.startsWith('groq:')
    const useCompact = isGroq || contextMode === 'compact'
    let csv = ''
    let noteText = ''
    let contextLabel = ''
    if (useCompact) {
      const agg = buildAggregatedContext(filtered)
      csv = agg.csv
      noteText = agg.note
      contextLabel = isGroq ? 'Aggregated (forced for Groq free tier)' : 'Aggregated (compact)'
    } else {
      const headers = ['date', 'metric_type', 'dimension_type', 'dimension_value', 'metric_value', 'event_type', 'event_name']
      const rows = filtered.slice(0, 5000).map(r => [ensureISO(r.date), r.metric_type || '', r.dimension_type || '', r.dimension_value || '', r.metric_value ?? '', r.event_type || '', r.event_name || ''].join(','))
      csv = [headers.join(','), ...rows].join('\n')
      contextLabel = 'Detailed CSV (capped at 5,000 rows)'
    }

    const system = `You are an analytics AI. Only use the provided dataset CSV and the question. Analyze trends across layers (pageviews, sessions, users, landing_page_traffic, events). Always:
- Return concise insights and practical action items.
- Propose a time-series visualization spec describing the series to plot (metric, group, units) and any events overlays to mark.
- Do not assume data outside the CSV.`

    const userContent = useCompact
      ? `Timeframe: ${dateStart} to ${dateEnd}\nQuestion: ${question}\n\nAggregated daily dataset (CSV):\n${csv}\n\nReference summaries (do not expand excessively):\n${noteText}`
      : `Timeframe: ${dateStart} to ${dateEnd}\nQuestion: ${question}\n\nDetailed rows CSV (capped to 5k rows):\n${csv}`

    const chart = buildChartData(filtered)

    // Direct route if user explicitly selects Groq
    if (model.startsWith('groq:')) {
      let groqResp = await fetch('/api/groq/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.split(':', 2)[1] || 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userContent }
          ]
        })
      })
      let text: string
      if (!groqResp.ok) {
        let err = await groqResp.text().catch(() => '')
        if (/<[a-z!/][\s\S]*>/i.test(err)) { err = err.replace(/<[^>]*>/g, ' ') }
        text = `AI request failed (${groqResp.status}). ${err || 'No details'}`
      } else {
        text = await groqResp.text()
      }
      setThreads(prev => [{ id: String(Date.now()), question, answer: text, chart, contextNote: contextLabel }, ...prev])
      setIsAsking(false)
      return
    }

    let resp = await fetch('/api/openai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent }
      ] })
    })
    let text: string
    if (!resp.ok) {
      let err1 = await resp.text().catch(() => '')
      if (/<[a-z!/][\s\S]*>/i.test(err1)) {
        err1 = err1.replace(/<[^>]*>/g, ' ')
      }
      // Retry via Anthropic only for quota/rate-limit cases AND if available
      if (anthropicAvailable && (resp.status === 429 || /quota|rate limit|insufficient_quota/i.test(err1))) {
        try {
          resp = await fetch('/api/anthropic/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [
              { role: 'system', content: system },
              { role: 'user', content: userContent }
            ] })
          })
        } catch {}
      }
      // Fallback to Groq if still failing and key exists
      if (!resp.ok && groqAvailable) {
        try {
          resp = await fetch('/api/groq/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              messages: [
                { role: 'system', content: system },
                { role: 'user', content: userContent }
              ]
            })
          })
        } catch {}
      }
      if (!resp.ok) {
        let err2 = await resp.text().catch(() => '')
        if (/<[a-z!/][\s\S]*>/i.test(err2)) {
          err2 = err2.replace(/<[^>]*>/g, ' ')
        }
        text = `AI request failed (${resp.status}). ${[err2, err1].filter(Boolean).join(' | ') || 'No details'}`
      } else {
        text = await resp.text()
      }
    } else {
      text = await resp.text()
    }
    setThreads(prev => [{ id: String(Date.now()), question, answer: text, chart, contextNote: contextLabel }, ...prev])
    setIsAsking(false)
  }

  return (
    <div className="pl-64 p-6 bg-background min-h-screen space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-indigo-900">
            <Zap className="w-5 h-5" />
            <span>AI Wizard</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Instructions */}
          <details className="mb-4">
            <summary className="cursor-pointer text-sm font-medium">Instructions the AI follows</summary>
            <div className="mt-2 text-sm text-muted-foreground space-y-2">
              <p>Grounded strictly in the Master Spreadsheet for the selected timeframe. It will not use external data.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Analyze trends across layers: pageviews, sessions, users, landing page traffic, and events.</li>
                <li>Always propose a time-series visualization and overlay relevant events.</li>
                <li>Return two sections: <strong>Insights</strong> and <strong>Action Items</strong>.</li>
                <li>Explain filters used so results are reproducible in the master table.</li>
              </ul>
            </div>
          </details>
          {loadError && (
            <div className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">{loadError}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm">Start date</label>
              <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">End date</label>
              <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
            </div>
            <div className="flex items-end">
              <div className="text-xs text-muted-foreground">{filtered.length.toLocaleString()} rows in range</div>
            </div>
          </div>
          <div className="mt-4">
            <label className="text-sm mb-1 block">Ask a question</label>
            <div className="flex gap-2">
              <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g., Why did pageviews dip in July and which sources changed?" />
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="h-10 self-end border rounded px-2 text-sm bg-white"
                aria-label="AI model"
                title="Choose AI model"
              >
                <option value="gpt-5">ChatGPT 5 (preferred)</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o mini (fallback)</option>
                {groqAvailable && (
                  <option value="groq:llama-3.1-8b-instant">Groq Llama 3.1 8B (free)</option>
                )}
              </select>
              <Button onClick={askAI} disabled={isAsking} className="whitespace-nowrap">
                <Send className="w-4 h-4 mr-2" /> {isAsking ? 'Analyzing...' : 'Ask'}
              </Button>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <label className="mr-1">Context:</label>
              <select
                value={contextMode}
                onChange={(e) => setContextMode(e.target.value as 'compact' | 'detailed')}
                className="h-7 border rounded px-2 bg-white"
                title="Choose how much data to send to the AI"
                disabled={model.startsWith('groq:')}
              >
                <option value="compact">Aggregated (compact)</option>
                <option value="detailed">Detailed CSV (cap 5k rows)</option>
              </select>
              {model.startsWith('groq:') && (
                <span className="ml-1">Forced compact for Groq free tier</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coverage summary (mini) */}
      <Card>
        <CardHeader>
          <CardTitle>Data Coverage Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            {Object.entries(coverage).map(([k, v]) => (
              <div key={k} className="p-3 rounded border bg-white">
                <div className="font-medium">{k}</div>
                <div className="text-muted-foreground">{v.count.toLocaleString()} rows</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Threads */}
      <div className="space-y-4">
        {threads.map(t => (
          <Card key={t.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Q: {t.question}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete card"
                onClick={() => setThreads(prev => prev.filter(p => p.id !== t.id))}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Time-series chart (2/3) */}
                <div className="lg:col-span-2">
                  {t.chart ? (
                    <MiniTimeSeriesChart data={t.chart} />
                  ) : (
                    <div className="border rounded h-64 flex items-center justify-center bg-white">
                      <div className="flex items-center text-muted-foreground"><LineChart className="w-4 h-4 mr-2"/>Preparing chart…</div>
                    </div>
                  )}
                </div>
                {/* AI answer (1/3) */}
                <div className="lg:col-span-1">
                  {t.contextNote && (
                    <div className="text-xs text-muted-foreground mb-2">Context: {t.contextNote}</div>
                  )}
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderBasicMarkdown(t.answer || '') }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}


