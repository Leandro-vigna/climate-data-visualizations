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

    // Fetch both tabs
    const [indicatorsResponse, sourcesResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Outcome Indicators!A:T',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Data Sources!A:H1000',
      })
    ]);

    const indicatorRows = indicatorsResponse.data.values || [];
    const sourceRows = sourcesResponse.data.values || [];

    if (indicatorRows.length === 0 || sourceRows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data found'
      });
    }

    const indicatorHeaders = indicatorRows[0];
    const sourceHeaders = sourceRows[0];
    
    // Find X-FIN-12 specifically
    const x_fin_12_row = indicatorRows.find(row => 
      row.some(cell => cell && cell.toString().includes('X-FIN-12'))
    );
    
    // Find the biodiversity source
    const biodiversitySource = sourceRows.find(row => 
      row.some(cell => cell && cell.toString().toLowerCase().includes('biodiversity') && 
                      cell.toString().toLowerCase().includes('comprehensive'))
    );

    return NextResponse.json({
      success: true,
      debug: {
        indicatorHeaders,
        sourceHeaders,
        x_fin_12_found: !!x_fin_12_row,
        x_fin_12_raw: x_fin_12_row || null,
        biodiversity_source_found: !!biodiversitySource,
        biodiversity_source_raw: biodiversitySource || null,
        total_indicators: indicatorRows.length - 1,
        total_sources: sourceRows.length - 1,
        // Show first few sources for reference
        sample_sources: sourceRows.slice(1, 6)
      }
    });

  } catch (error: any) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
