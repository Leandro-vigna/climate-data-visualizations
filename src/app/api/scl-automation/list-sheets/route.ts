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
        error: 'Authentication required'
      }, { status: 401 });
    }

    const spreadsheetId = process.env.SCL_SPREADSHEET_ID;
    if (!spreadsheetId) {
      return NextResponse.json({
        success: false,
        error: 'SCL_SPREADSHEET_ID not configured'
      }, { status: 400 });
    }

    // Initialize Google Sheets API with user's OAuth token
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: (session as any).accessToken });
    const sheets = google.sheets({ version: 'v4', auth });

    // Get spreadsheet metadata
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });

    const sheetList = metadata.data.sheets?.map(sheet => ({
      name: sheet.properties?.title,
      id: sheet.properties?.sheetId,
      index: sheet.properties?.index,
      gridProperties: sheet.properties?.gridProperties
    })) || [];

    // Try to get sample data from each sheet
    const sheetData: any = {};
    
    for (const sheet of sheetList) {
      try {
        const sampleResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: spreadsheetId,
          range: `'${sheet.name}'!1:3`, // Get first 3 rows
        });
        
        sheetData[sheet.name || 'unknown'] = {
          success: true,
          rows: sampleResponse.data.values || [],
          rowCount: sampleResponse.data.values?.length || 0
        };
      } catch (error: any) {
        sheetData[sheet.name || 'unknown'] = {
          success: false,
          error: error.message
        };
      }
    }

    return NextResponse.json({
      success: true,
      spreadsheetId,
      spreadsheetTitle: metadata.data.properties?.title,
      sheets: sheetList,
      sheetData
    });

  } catch (error: any) {
    console.error('List sheets error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
