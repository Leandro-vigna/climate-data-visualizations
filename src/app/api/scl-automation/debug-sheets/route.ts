import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../authOptions';

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

    // Get the spreadsheet ID (from URL param or environment)
    const urlParams = new URL(request.url).searchParams;
    const spreadsheetId = urlParams.get('spreadsheetId') || process.env.SCL_SPREADSHEET_ID;
    
    if (!spreadsheetId) {
      return NextResponse.json({
        success: false,
        error: 'SCL_SPREADSHEET_ID not configured. Please provide spreadsheetId parameter or set environment variable.'
      }, { status: 400 });
    }

    // Initialize Google Sheets API with user's OAuth token
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: (session as any).accessToken });
    const sheets = google.sheets({ version: 'v4', auth });

    // Get spreadsheet metadata to see all sheet names
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });

    const sheetNames = metadata.data.sheets?.map(sheet => ({
      name: sheet.properties?.title,
      id: sheet.properties?.sheetId,
      index: sheet.properties?.index
    })) || [];

    // Try to get a small sample from each sheet to understand the data structure
    const sheetSamples: any = {};
    
    for (const sheet of sheetNames) {
      try {
        const sampleData = await sheets.spreadsheets.values.get({
          spreadsheetId: spreadsheetId,
          range: `'${sheet.name}'!A1:Z5`, // Get first 5 rows and columns A-Z
        });
        
        sheetSamples[sheet.name || 'unknown'] = {
          rows: sampleData.data.values?.length || 0,
          firstRow: sampleData.data.values?.[0] || [],
          sampleData: sampleData.data.values || []
        };
      } catch (error) {
        sheetSamples[sheet.name || 'unknown'] = {
          error: 'Failed to read sheet'
        };
      }
    }

    return NextResponse.json({
      success: true,
      spreadsheetId,
      spreadsheetTitle: metadata.data.properties?.title,
      sheets: sheetNames,
      sheetSamples
    });

  } catch (error: any) {
    console.error('Debug sheets error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error
    }, { status: 500 });
  }
}
