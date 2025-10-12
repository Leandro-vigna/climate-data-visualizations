import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../authOptions';

// Google Sheets configuration
const SPREADSHEET_ID = '1jJOgcdwMm271zFDhZlhEgHof1nqOqlcCrLXrPKikO8o';

export async function GET(request: NextRequest) {
  try {
    // Get user session and access token
    const session = await getServerSession(authOptions);
    
    if (!(session as any)?.accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required. Please sign in to access Google Sheets.',
        requiresAuth: true
      }, { status: 401 });
    }

    // Initialize Google Sheets API with user's OAuth token
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: (session as any).accessToken });

    const sheets = google.sheets({ version: 'v4', auth });

    // Try to get the correct sheet name first
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    
    console.log('Available sheets:', spreadsheet.data.sheets?.map(s => s.properties?.title));
    
    // Look for the enabler/barrier sheet - it might have a slightly different name
    const enablerBarrierSheet = spreadsheet.data.sheets?.find(sheet => 
      sheet.properties?.title?.toLowerCase().includes('enabler') || 
      sheet.properties?.title?.toLowerCase().includes('barrier')
    );
    
    if (!enablerBarrierSheet) {
      return NextResponse.json({ 
        error: 'Enabler and Barrier Indicators sheet not found',
        availableSheets: spreadsheet.data.sheets?.map(s => s.properties?.title) || []
      }, { status: 404 });
    }
    
    const sheetName = enablerBarrierSheet.properties?.title || 'Enabler and Barrier Indicators';
    const range = `${sheetName}!A:Z`;
    
    console.log('Using sheet name:', sheetName);

    // Fetch data from Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return NextResponse.json({ error: 'No data found in Enabler and Barrier Indicators tab' }, { status: 404 });
    }

    // First row contains headers
    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Convert to structured data (same format as outcome indicators)
    const structuredData = dataRows.map((row, index) => {
      const item: any = { rowNumber: index + 2 }; // +2 because we skip header and arrays are 0-indexed
      
      headers.forEach((header, colIndex) => {
        const value = row[colIndex] || '';
        
        // Clean up header names to match our interface
        const cleanHeader = header.toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^\w_]/g, '');
        
        item[cleanHeader] = value;
        // Also store with original header name for flexible access
        item[header] = value;
      });

      // Ensure we have the key fields
      if (!item.id) item.id = item.rowNumber.toString();
      if (!item.shift) item.shift = '';
      if (!item.title) item.title = '';
      if (!item.source) item.source = '';
      if (!item.status) item.status = '';
      if (!item.last_accessed_date) item.last_accessed_date = '';

      return item;
    });

    console.log(`Fetched ${structuredData.length} enabler and barrier indicators`);
    console.log('Sample enabler/barrier indicator:', structuredData[0]);

    return NextResponse.json({
      success: true,
      data: structuredData,
      totalRecords: structuredData.length,
      lastUpdated: new Date().toISOString(),
      sourceRange: range,
      tab: sheetName,
      // Debug info
      debug: {
        headers: headers,
        sampleRow: structuredData.length > 0 ? {
          allKeys: Object.keys(structuredData[0]),
          firstRow: structuredData[0]
        } : null
      }
    });

  } catch (error: any) {
    console.error('Error fetching enabler and barrier indicators:', error);
    
    // Try to get available sheets for debugging
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      
      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: process.env.SCL_SPREADSHEET_ID,
      });
      
      const availableSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch enabler and barrier indicators', 
          details: error.message,
          availableSheets: availableSheets,
          debugInfo: 'Check console for more details'
        }, 
        { status: 500 }
      );
    } catch (debugError) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch enabler and barrier indicators', 
          details: error.message,
          debugError: debugError.message
        }, 
        { status: 500 }
      );
    }
  }
}
