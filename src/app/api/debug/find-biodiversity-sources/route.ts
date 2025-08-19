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

    const sourcesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Data Sources!A:H1000', // Fetch up to row 1000 to ensure we get all data
    });

    const sourceRows = sourcesResponse.data.values || [];
    const sourceHeaders = sourceRows[0];
    
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
    
    // Find sources that might be related to biodiversity or finance
    const biodiversityRelated = structuredSources.filter(src => {
      const name = (src.name || '').toLowerCase();
      return name.includes('biodiversity') || 
             name.includes('nature') || 
             name.includes('comprehensive') || 
             name.includes('overview') ||
             name.includes('global') ||
             name.includes('finance');
    });
    
    // Check if the exact source exists
    const exactMatch = structuredSources.find(src => 
      (src.name || '').toLowerCase() === 'a comprehensive overview of global biodiversity finance'
    );

    return NextResponse.json({
      success: true,
      debug: {
        totalSources: structuredSources.length,
        exactMatchFound: !!exactMatch,
        exactMatch: exactMatch || null,
        biodiversityRelated: biodiversityRelated.map(src => ({
          name: src.name,
          provider: src.provider,
          lastUpdated: src.last_updated_date || src['last updated date'],
          url: src.url
        })),
        allSources: structuredSources.map(src => ({
          name: src.name,
          provider: src.provider,
          lastUpdated: src.last_updated_date || src['last updated date']
        }))
      }
    });

  } catch (error: any) {
    console.error('Find biodiversity sources debug API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
