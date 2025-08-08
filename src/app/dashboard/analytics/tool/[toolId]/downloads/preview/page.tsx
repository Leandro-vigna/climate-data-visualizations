'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, CheckCircle, Download } from 'lucide-react';

interface DailyRow { date: string; downloads: number; }

export default function DownloadsPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const toolId = params?.toolId as string;

  const [rows, setRows] = useState<DailyRow[]>([]);
  const [meta, setMeta] = useState<{ totalDays?: number; totalDownloads?: number; dateRange?: { start: string|null; end: string|null } } | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('downloadsPreview');
    if (!raw) {
      router.push(`/dashboard/analytics/tool/${toolId}`);
      return;
    }
    try {
      const json = JSON.parse(raw);
      setRows(json.data || []);
      setMeta({ totalDays: json.totalDays, totalDownloads: json.totalDownloads, dateRange: json.dateRange });
    } catch {
      router.push(`/dashboard/analytics/tool/${toolId}`);
    }
  }, [toolId, router]);

  const handleDownloadCsv = () => {
    if (!rows.length) return;
    const headers = ['Date', 'Downloads'];
    const csv = [headers.join(','), ...rows.map(r => `${r.date},${r.downloads}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `downloads-preview-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMerge = async () => {
    if (!rows.length) return;
    const payload = {
      toolId,
      toolName: 'Downloads',
      timePeriod: `${meta?.dateRange?.start || ''} → ${meta?.dateRange?.end || ''}`,
      dataLayers: ['downloads'],
      dataSource: 'custom-sheet',
      totalRecords: rows.length,
      // stored as unified rows (date + metric_type + dimension_type + dimension_value + metric_value)
      data: rows.map(r => ({ date: r.date, page: undefined, pageViews: undefined, country: undefined, activeUsers: undefined, landingPage: undefined, source: undefined, medium: undefined, sessions: undefined, downloads: r.downloads }))
    };
    const resp = await fetch('/api/analytics/collections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await resp.json();
    if (!resp.ok || !json.success) {
      alert(json.error || 'Failed to merge downloads');
      return;
    }
    router.push(`/dashboard/analytics/tool/${toolId}/collections`);
  };

  return (
    <div className="pl-64 p-6 bg-background min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={() => router.push(`/dashboard/analytics/tool/${toolId}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
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
          <CardTitle>Downloads Preview{meta?.dateRange ? ` (${meta.dateRange.start} → ${meta.dateRange.end})` : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Downloads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 2000).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.date}</TableCell>
                    <TableCell>{r.downloads.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


