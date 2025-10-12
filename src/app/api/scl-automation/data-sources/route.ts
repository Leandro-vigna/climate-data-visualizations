import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../authOptions';

// Google Sheets configuration
const SPREADSHEET_ID = '1jJOgcdwMm271zFDhZlhEgHof1nqOqlcCrLXrPKikO8o';
const DATA_SOURCES_RANGE = 'Data Sources!A:Z'; // Expanded to get all columns

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

    // Fetch data from the spreadsheet with explicit options to get all data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: DATA_SOURCES_RANGE,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING'
    });

    const rows = response.data.values;



    if (!rows || rows.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: [], 
        message: 'No data found in the data sources sheet' 
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
        
        // Clean up header names
        const cleanHeader = header.toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^\w_]/g, '');
        
        item[cleanHeader] = value;
        // Also store with original header name for flexible access
        item[header] = value;
      });

      // Ensure we have the key fields with proper names
      return {
        provider: item.provider || '',
        name: item.name || '',
        url: item.url || '',
        description: item.description || '',
        // Try multiple possible column names for last updated
        last_updated: item.last_updated || item.lastupdated || item['last updated'] || item['Last Updated'] || item['last_updated_date'] || '',
        rowNumber: item.rowNumber
      };
    });



    return NextResponse.json({
      success: true,
      data: structuredData,
      totalRecords: structuredData.length,
      lastUpdated: new Date().toISOString(),
      sourceRange: DATA_SOURCES_RANGE,
      // Debug info
      debug: {
        headers: headers,
        sampleRow: structuredData.length > 0 ? {
          allKeys: Object.keys(structuredData[0]),
          lastUpdatedValue: structuredData[0].last_updated
        } : null
      }
    });

  } catch (error: any) {
    console.error('Error fetching data sources:', error);
    
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
        error: 'Failed to fetch data sources from Google Sheets',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
