'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle, Download } from 'lucide-react'

interface EventRow { date: string; type: string; name: string; description: string }

export default function EventsPreviewPage() {
  const params = useParams()
  const router = useRouter()
  const toolId = params.toolId as string
  const [rows, setRows] = useState<EventRow[]>([])
  const [total, setTotal] = useState(0)
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({})
  const [filteredNote, setFilteredNote] = useState<string | undefined>(undefined)

  useEffect(() => {
    const s = sessionStorage.getItem('eventsPreview')
    if (!s) {
      router.push(`/dashboard/analytics/tool/${toolId}`)
      return
    }
    const json = JSON.parse(s)
    setRows(Array.isArray(json.preview) ? json.preview : [])
    setTotal(typeof json.total === 'number' ? json.total : (json.totalRecords || 0))
    if (json.startDate || json.endDate) {
      setDateRange({ start: json.startDate, end: json.endDate })
    }
    if (json.filteredOutUnknown) {
      setFilteredNote(`Filtered out ${json.filteredOutUnknown} "Unknown" type rows to keep data clean.`)
    } else if (json.note) {
      setFilteredNote(json.note)
    }
  }, [])

  const handleDownloadCsv = () => {
    if (!rows.length) return
    const headers = ['Date', 'Type', 'Name', 'Description']
    const csv = [headers.join(','), ...rows.map(r => [r.date, r.type, r.name, (r.description || '').replace(/\n|\r/g, ' ')].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `events-preview-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleMerge = async () => {
    if (!rows.length) return
    const payload = {
      toolId,
      toolName: 'Events',
      timePeriod: `${dateRange.start || ''} → ${dateRange.end || ''}`,
      dataLayers: ['events'],
      dataSource: 'asana',
      totalRecords: rows.length,
      data: rows.map(r => ({
        date: r.date,
        metric_type: 'events',
        dimension_type: r.type || 'event',
        dimension_value: r.name,
        metric_value: 1,
        event_type: r.type,
        event_name: r.name,
        description: r.description || ''
      }))
    }
    const resp = await fetch('/api/analytics/collections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await resp.json()
    if (!resp.ok || !json.success) {
      alert(json.error || 'Failed to merge events')
      return
    }
    router.push(`/dashboard/analytics/tool/${toolId}/collections`)
  }

  return (
    <div className="pl-64 p-6 bg-background min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={() => router.push(`/dashboard/analytics/tool/${toolId}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="text-sm text-muted-foreground">
          {total ? `${total.toLocaleString()} rows` : ''} {dateRange.start ? `• ${dateRange.start} → ${dateRange.end}` : ''}
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleDownloadCsv}>
            <Download className="w-4 h-4 mr-2" /> Download CSV
          </Button>
          <Button onClick={handleMerge}>
            <CheckCircle className="w-4 h-4 mr-2" /> Merge Data into Master Spreadsheet
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Events Preview{dateRange.start ? ` (${dateRange.start} → ${dateRange.end})` : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNote && (
            <div className="mb-3 text-xs text-muted-foreground">{filteredNote}</div>
          )}
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rows to preview.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead className="w-[160px]">Type</TableHead>
                    <TableHead className="min-w-[280px] w-[40%]">Name</TableHead>
                    <TableHead className="min-w-[400px]">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 2000).map((r, i) => (
                    <TableRow key={i} className="align-top">
                      <TableCell className="whitespace-nowrap">{r.date}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.type}</TableCell>
                      <TableCell className="max-w-xl">{r.name}</TableCell>
                      <TableCell className="max-w-3xl whitespace-pre-wrap break-words">{r.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-2">Showing first {Math.min(rows.length, 2000).toLocaleString()} of {total.toLocaleString()} rows</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


