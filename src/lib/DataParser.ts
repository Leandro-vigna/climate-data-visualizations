// DataParser.ts
// Utility functions for parsing CSV and Excel files into unified time series data structures.
import Papa, { ParseResult } from 'papaparse';
import * as XLSX from 'xlsx';

export interface RawRow {
  Month: number;
  Year: number;
  [platform: string]: number | string;
}

export interface ParsedRecord {
  month: number;
  year: number;
  platformName: string;
  users: number;
}

export interface AggregatedPoint {
  month: number;
  year: number;
  [platformName: string]: number;
}

// Parse a single CSV file into RawRow[]
async function parseCSV(file: File): Promise<RawRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: ParseResult<RawRow>) => {
        resolve(results.data as RawRow[]);
      },
      error: (err: Error) => reject(err),
      dynamicTyping: true,
    });
  });
}

// Parse a single Excel file into RawRow[]
async function parseExcel(file: File): Promise<RawRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json: RawRow[] = XLSX.utils.sheet_to_json(sheet, { defval: 0 });
      resolve(json);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Parse multiple files and return unified ParsedRecord[]
export async function parseFiles(files: File[]): Promise<ParsedRecord[]> {
  let allRows: RawRow[] = [];
  for (const file of files) {
    if (file.name.endsWith('.csv')) {
      const rows = await parseCSV(file);
      allRows = allRows.concat(rows);
    } else if (file.name.endsWith('.xlsx')) {
      const rows = await parseExcel(file);
      allRows = allRows.concat(rows);
    }
  }
  // Convert RawRow[] to ParsedRecord[]
  const records: ParsedRecord[] = [];
  allRows.forEach(row => {
    const { Month, Year, ...platforms } = row;
    Object.entries(platforms).forEach(([platformName, value]) => {
      if (platformName === 'Month' || platformName === 'Year') return;
      const users = typeof value === 'number' ? value : parseInt(value as string, 10);
      if (!isNaN(users)) {
        records.push({
          month: typeof Month === 'string' ? parseInt(Month, 10) : Month,
          year: typeof Year === 'string' ? parseInt(Year, 10) : Year,
          platformName,
          users,
        });
      }
    });
  });
  return records;
} 