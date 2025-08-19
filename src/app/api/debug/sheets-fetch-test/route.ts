import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../authOptions';

const SPREADSHEET_ID = '1jJOgcdwMm271zFDhZlhEgHof1nqOqlcCrLXrPKikO8o';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!(session as any)?.accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: (session as any).accessToken });
    const sheets = google.sheets({ version: 'v4', auth });

    // Test different ranges to see what we get
    const tests = [
      { name: 'A:H', range: 'Data Sources!A:H' },
      { name: 'A:H1000', range: 'Data Sources!A:H1000' },
      { name: 'A:Z', range: 'Data Sources!A:Z' },
      { name: 'A593:H593', range: 'Data Sources!A593:H593' }, // Specific row where biodiversity source should be
      { name: 'A590:H600', range: 'Data Sources!A590:H600' }, // Range around row 593
    ];

    const results: any = {};

    for (const test of tests) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: test.range,
        });
        
        const rows = response.data.values || [];
        results[test.name] = {
          totalRows: rows.length,
          firstRow: rows[0] || null,
          lastRow: rows[rows.length - 1] || null,
          sampleRows: rows.slice(0, 3),
          foundBiodiversity: rows.some(row => 
            row.some(cell => cell && cell.toString().toLowerCase().includes('comprehensive') && 
                            cell.toString().toLowerCase().includes('biodiversity'))
          )
        };
      } catch (error) {
        results[test.name] = { error: error.message };
      }
    }

    return NextResponse.json({
      success: true,
      debug: {
        spreadsheetId: SPREADSHEET_ID,
        testResults: results
      }
    });

  } catch (error: any) {
    console.error('Sheets fetch test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
