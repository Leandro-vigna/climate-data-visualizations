import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../authOptions';

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

    // Get the spreadsheet ID
    const spreadsheetId = '1jJOgcdwMm271zFDhZlhEgHof1nqOqlcCrLXrPKikO8o';

    // Initialize Google Sheets API with user's OAuth token
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: (session as any).accessToken });
    const sheets = google.sheets({ version: 'v4', auth });

    // Test: Get spreadsheet metadata
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });

    const sheetNames = metadata.data.sheets?.map(sheet => sheet.properties?.title) || [];

    // Test: Try to get data from "Outcome Indicators" sheet
    let outcomeData = null;
    let dataSourcesData = null;

    try {
      const outcomeResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: 'Outcome Indicators!A1:T3', // Get first 3 rows
      });
      outcomeData = {
        success: true,
        rows: outcomeResponse.data.values?.length || 0,
        sampleData: outcomeResponse.data.values || []
      };
    } catch (error: any) {
      outcomeData = {
        success: false,
        error: error.message
      };
    }

    // Test: Try to get data from "Data Sources" sheet
    try {
      const sourcesResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: 'Data Sources!A1:G3', // Get first 3 rows
      });
      dataSourcesData = {
        success: true,
        rows: sourcesResponse.data.values?.length || 0,
        sampleData: sourcesResponse.data.values || []
      };
    } catch (error: any) {
      dataSourcesData = {
        success: false,
        error: error.message
      };
    }

    return NextResponse.json({
      success: true,
      spreadsheetId,
      spreadsheetTitle: metadata.data.properties?.title,
      sheetNames,
      tests: {
        outcomeIndicators: outcomeData,
        dataSources: dataSourcesData
      },
      environment: {
        hasSpreadsheetId: !!spreadsheetId,
        spreadsheetIdSource: process.env.SCL_SPREADSHEET_ID ? 'environment' : 'fallback'
      }
    });

  } catch (error: any) {
    console.error('Simple test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}
