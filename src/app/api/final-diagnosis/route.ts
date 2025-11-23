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
        error: 'Not authenticated - please sign in with Google'
      }, { status: 401 });
    }

    // Initialize Google Sheets API
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: (session as any).accessToken });
    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    // Test multiple possible IDs
    const possibleIds = [
      '1JiOgcdwMm27IzFDhZlhEgHoT1nQqlcCrLXrPKtK08o', // Current one we're trying
      '1JiOgcdwMm271zFDhZlhEgHof1nqOqlcCrLXrPKtK08o', // Alternative
      process.env.SCL_SPREADSHEET_ID // From environment
    ].filter(Boolean);

    const results: any = {};

    // Test each possible ID
    for (const id of possibleIds) {
      try {
        const metadata = await sheets.spreadsheets.get({ spreadsheetId: id });
        results[id as string] = {
          success: true,
          title: metadata.data.properties?.title,
          sheets: metadata.data.sheets?.map(s => s.properties?.title)
        };
      } catch (error: any) {
        results[id as string] = {
          success: false,
          error: error.message
        };
      }
    }

    // Also try to list files in Drive to see what spreadsheets you have access to
    let driveFiles: any[] = [];
    try {
      const driveResponse = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet' and name contains 'SCL'",
        fields: 'files(id, name, webViewLink)'
      });
      driveFiles = driveResponse.data.files || [];
    } catch (error: any) {
      // Drive API might not be enabled, that's okay
    }

    return NextResponse.json({
      success: true,
      message: 'Diagnosis complete',
      userEmail: session?.user?.email,
      environment: {
        SCL_SPREADSHEET_ID: process.env.SCL_SPREADSHEET_ID || 'NOT SET'
      },
      spreadsheetTests: results,
      accessibleSpreadsheets: driveFiles,
      recommendation: driveFiles.length > 0 
        ? `Found ${driveFiles.length} SCL spreadsheets you have access to. Use one of these IDs.`
        : 'No SCL spreadsheets found. Check if you\'re signed in with the right Google account.'
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
