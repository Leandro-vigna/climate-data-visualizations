import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    currentSpreadsheetId: process.env.SCL_SPREADSHEET_ID || 'NOT_SET',
    allEnvVars: Object.keys(process.env).filter(key => key.includes('SCL')),
    timestamp: new Date().toISOString()
  });
}
