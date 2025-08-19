import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../authOptions';

// Google Sheets configuration
const SPREADSHEET_ID = '1jJOgcdwMm271zFDhZlhEgHof1nqOqlcCrLXrPKikO8o';
const OUTCOME_INDICATORS_RANGE = 'Outcome Indicators!A:T'; // Adjust range as needed

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

    // Fetch data from the spreadsheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: OUTCOME_INDICATORS_RANGE,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: [], 
        message: 'No data found in the spreadsheet' 
      });
    }

    // First row contains headers
    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Convert to structured data
    const structuredData = dataRows.map((row, index) => {
      const item: any = { rowNumber: index + 2 }; // +2 because we skip header and arrays are 0-indexed
      
      headers.forEach((header, colIndex) => {
        const value = row[colIndex] || '';
        
        // Clean up header names to match our interface
        const cleanHeader = header.toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^\w_]/g, '');
        
        item[cleanHeader] = value;
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

    return NextResponse.json({
      success: true,
      data: structuredData,
      totalRecords: structuredData.length,
      lastUpdated: new Date().toISOString(),
      sourceRange: OUTCOME_INDICATORS_RANGE
    });

  } catch (error: any) {
    console.error('Error fetching outcome indicators:', error);
    
    // Check if it's an authentication error
    if (error.message?.includes('authentication') || error.message?.includes('credentials')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Google Sheets authentication failed. Please check your service account credentials.',
          details: error.message 
        },
        { status: 401 }
      );
    }

    // Check if it's a permissions error
    if (error.message?.includes('permission') || error.message?.includes('access')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Permission denied. Please ensure the service account has access to the spreadsheet.',
          details: error.message 
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch outcome indicators from Google Sheets',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
