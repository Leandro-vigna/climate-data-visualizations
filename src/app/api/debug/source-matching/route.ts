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
    
    const indicatorHeaders = indicatorRows[0];
    const sourceHeaders = sourceRows[0];
    
    // Find X-FIN-12 row and extract its source field
    const x_fin_12_row = indicatorRows.find(row => 
      row.some(cell => cell && cell.toString().includes('X-FIN-12'))
    );
    
    // Convert X-FIN-12 to structured data
    let x_fin_12_structured: any = {};
    if (x_fin_12_row) {
      indicatorHeaders.forEach((header, index) => {
        const cleanHeader = header.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
        x_fin_12_structured[cleanHeader] = x_fin_12_row[index] || '';
        x_fin_12_structured[header] = x_fin_12_row[index] || '';
      });
    }
    
    // Convert sources to structured data
    const structuredSources = sourceRows.slice(1).map(row => {
      const source: any = {};
      sourceHeaders.forEach((header, index) => {
        const cleanHeader = header.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
        source[cleanHeader] = row[index] || '';
        source[header] = row[index] || '';
      });
      return source;
    });
    
    // Find the biodiversity source in structured format
    const biodiversitySource = structuredSources.find(src => 
      (src.name || '').toLowerCase().includes('biodiversity') || 
      (src.name || '').toLowerCase().includes('comprehensive')
    );
    
    // Extract the source field from X-FIN-12
    const sourceField = x_fin_12_structured.source || x_fin_12_structured.q || '';
    
    // Try to match the source using the same logic as the main code
    let matchingSource = null;
    if (sourceField) {
      const sourceClean = sourceField.toLowerCase().trim();
      matchingSource = structuredSources.find(src => {
        const dsName = src.name || '';
        const dsNameClean = dsName.toLowerCase().trim();
        
        return dsNameClean === sourceClean || 
               dsNameClean.includes(sourceClean) || 
               sourceClean.includes(dsNameClean);
      });
    }

    return NextResponse.json({
      success: true,
      debug: {
        indicatorHeaders,
        sourceHeaders,
        x_fin_12_structured,
        sourceField,
        biodiversitySource,
        matchingSource,
        allSourceNames: structuredSources.map(s => s.name).slice(0, 20),
        matchingAttempt: {
          sourceFieldClean: sourceField.toLowerCase().trim(),
          biodiversityNameClean: biodiversitySource ? biodiversitySource.name.toLowerCase().trim() : null,
          exactMatch: biodiversitySource ? biodiversitySource.name.toLowerCase().trim() === sourceField.toLowerCase().trim() : false,
          sourceIncludesBio: biodiversitySource ? sourceField.toLowerCase().includes(biodiversitySource.name.toLowerCase()) : false,
          bioIncludesSource: biodiversitySource ? biodiversitySource.name.toLowerCase().includes(sourceField.toLowerCase()) : false
        }
      }
    });

  } catch (error: any) {
    console.error('Source matching debug API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
