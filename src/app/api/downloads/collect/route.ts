import { NextRequest, NextResponse } from 'next/server';

interface DownloadDailyRow {
  date: string; // YYYY-MM-DD
  downloads: number;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (char === ',') {
        row.push(field);
        field = '';
        i++;
        continue;
      }
      if (char === '\n' || char === '\r') {
        // handle CRLF and LF
        if (char === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
        continue;
      }
      field += char;
      i++;
    }
  }
  // push last field
  row.push(field);
  rows.push(row);
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

type DateOrder = 'DMY' | 'MDY';

function tryParseDayFirst(parts: number[]): string | null {
  const [d, m, y] = parts;
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt.toISOString().split('T')[0];
}

function tryParseMonthFirst(parts: number[]): string | null {
  const [m, d, y] = parts;
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt.toISOString().split('T')[0];
}

function normalizeDate(value: string, preferredOrder: DateOrder = 'DMY'): string | null {
  if (!value) return null;
  const v = value.trim();
  const main = v.split(/\s+/)[0]; // handle date-time like "13/07/2018 12:34:56"
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(main)) return main;
  // Try YYYY/MM/DD
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(main)) {
    const [y, m, d] = main.split('/').map(Number);
    const dt = new Date(y, m - 1, d);
    if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
  }
  // Try DD/MM/YYYY or MM/DD/YYYY with inference
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(main)) {
    const [a, b, y] = main.split('/').map(Number);
    if (a > 12 && b <= 12) return tryParseDayFirst([a, b, y]);
    if (b > 12 && a <= 12) return tryParseMonthFirst([a, b, y]);
    // ambiguous: fall back to preferred order (default DMY)
    return preferredOrder === 'DMY' ? tryParseDayFirst([a, b, y]) : tryParseMonthFirst([a, b, y]);
  }
  // Try DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(main)) {
    const [a, b, y] = main.split('-').map(Number);
    if (a > 12 && b <= 12) return tryParseDayFirst([a, b, y]);
    if (b > 12 && a <= 12) return tryParseMonthFirst([a, b, y]);
    return preferredOrder === 'DMY' ? tryParseDayFirst([a, b, y]) : tryParseMonthFirst([a, b, y]);
  }
  // Try DD.MM.YYYY
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(main)) {
    const [a, b, y] = main.split('.').map(Number);
    return preferredOrder === 'DMY' ? tryParseDayFirst([a, b, y]) : tryParseMonthFirst([a, b, y]);
  }
  // Try ISO date-time
  const dt = new Date(main);
  if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
  return null;
}

async function fetchGoogleSheetAsCsv(url: string): Promise<string> {
  // Support direct CSV or a Sheets viewing URL
  if (url.includes('out=csv')) {
    const resp = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
    if (!resp.ok) throw new Error(`Failed to fetch CSV (${resp.status})`);
    return await resp.text();
  }
  // Try extracting sheet id
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error('Unsupported Google Sheets URL. Provide a CSV export link or a standard Sheets link.');
  const sheetId = match[1];
  // Preserve gid if present to target the correct worksheet
  const gidMatch = url.match(/[?&]gid=(\d+)/);
  const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${gidParam}`;
  const resp = await fetch(exportUrl, { headers: { 'Cache-Control': 'no-cache' } });
  if (!resp.ok) throw new Error(`Failed to fetch sheet CSV (${resp.status})`);
  return await resp.text();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, csvContent, startDate, endDate, dateFormat } = body as {
      url?: string;
      csvContent?: string;
      startDate?: string;
      endDate?: string;
      dateFormat?: DateOrder;
    };

    if (!url && !csvContent) {
      return NextResponse.json({ success: false, error: 'Provide either a URL or csvContent' }, { status: 400 });
    }

    const csv = csvContent || (await fetchGoogleSheetAsCsv(url!));
    const table = parseCsv(csv);
    if (table.length === 0) {
      return NextResponse.json({ success: false, error: 'No rows in CSV' }, { status: 400 });
    }

    // Detect header row: if first row contains any non-text date-like values in other rows, we still treat first as header
    const headers = table[0].map(h => (h || '').toString().trim().toLowerCase());
    let dateIdx = headers.findIndex(h => /date|time|timestamp/.test(h));
    if (dateIdx === -1) {
      // Heuristic: search first data row for a likely date column and assume same index
      const probe = table[1] || [];
      for (let c = 0; c < probe.length; c++) {
        if (normalizeDate(probe[c])) { dateIdx = c; break; }
      }
    }
    if (dateIdx === -1) {
      return NextResponse.json({ success: false, error: 'Could not find a date/timestamp column' }, { status: 400 });
    }

    // Infer date order if ambiguous mm/dd vs dd/mm
    let inferredOrder: DateOrder = dateFormat || 'DMY';
    try {
      const sampleStart = 1; // skip headers
      const sampleEnd = Math.min(table.length, sampleStart + 50);
      let monthFirstHits = 0;
      let dayFirstHits = 0;
      for (let r = sampleStart; r < sampleEnd; r++) {
        const cell = table[r]?.[dateIdx];
        if (typeof cell !== 'string') continue;
        const m = cell.trim().split(/\s+/)[0];
        const m2 = m.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m2) {
          const a = parseInt(m2[1], 10);
          const b = parseInt(m2[2], 10);
          if (a > 12 && b <= 12) dayFirstHits++;
          else if (b > 12 && a <= 12) monthFirstHits++;
        }
      }
      if (monthFirstHits > dayFirstHits) inferredOrder = 'MDY';
      else if (dayFirstHits > monthFirstHits) inferredOrder = 'DMY';
    } catch {}

    // Aggregate per day
    const counts: Record<string, number> = {};
    // If headers row doesn’t look like headers (no letters), start from 0
    const headerLooksLikeHeaders = headers.some(h => /[a-z]/.test(h));
    const startRow = headerLooksLikeHeaders ? 1 : 0;
    for (let r = startRow; r < table.length; r++) {
      const row = table[r];
      const dt = normalizeDate(row[dateIdx], inferredOrder);
      if (!dt) continue;
      if (startDate && dt < startDate) continue;
      if (endDate && dt > endDate) continue;
      counts[dt] = (counts[dt] || 0) + 1;
    }

    const data: DownloadDailyRow[] = Object.keys(counts)
      .sort()
      .map(date => ({ date, downloads: counts[date] }));

    return NextResponse.json({
      success: true,
      data,
      totalDays: data.length,
      totalDownloads: data.reduce((s, d) => s + d.downloads, 0),
      dateRange: {
        start: startDate || (data[0]?.date || null),
        end: endDate || (data[data.length - 1]?.date || null),
      },
      sourceType: url ? 'url' : 'upload',
    });
  } catch (error: any) {
    console.error('Downloads collect error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to collect downloads' }, { status: 500 });
  }
}


