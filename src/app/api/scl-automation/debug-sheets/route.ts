import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/authOptions';

export async function GET(request: NextRequest) {
  try {
    // Get the session to verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the spreadsheet ID from environment variables
    const spreadsheetId = process.env.SCL_SPREADSHEET_ID;
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'SCL_SPREADSHEET_ID not configured' }, { status: 500 });
    }

    console.log('Spreadsheet ID:', spreadsheetId);

    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Get spreadsheet info
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const availableSheets = spreadsheet.data.sheets?.map(sheet => ({
      title: sheet.properties?.title,
      sheetId: sheet.properties?.sheetId,
      sheetType: sheet.properties?.sheetType
    })) || [];

    console.log('Available sheets:', availableSheets);

    return NextResponse.json({
      success: true,
      spreadsheetId,
      availableSheets,
      count: availableSheets.length
    });

  } catch (error: any) {
    console.error('Error getting sheet info:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get sheet info', 
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}