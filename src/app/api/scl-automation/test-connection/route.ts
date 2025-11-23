import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../authOptions';

export async function GET(request: NextRequest) {
  try {
    // Get user session and access token
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required. Please sign in with your Google account.',
        requiresAuth: true,
        instructions: 'Click the sign-in button to authenticate with Google'
      }, { status: 401 });
    }

    if (!(session as any)?.accessToken) {
      return NextResponse.json({
        success: false,
        error: 'No access token available. Please sign out and sign in again.',
        requiresAuth: true,
        instructions: 'Your session may be expired. Please sign out and sign back in.'
      }, { status: 401 });
    }

    // Check if we have the spreadsheet ID (from URL param or environment)
    const urlParams = new URL(request.url).searchParams;
    const spreadsheetId = urlParams.get('spreadsheetId') || process.env.SCL_SPREADSHEET_ID;
    
    if (!spreadsheetId) {
      return NextResponse.json({
        success: false,
        error: 'SCL_SPREADSHEET_ID not configured',
        instructions: 'Please add SCL_SPREADSHEET_ID to Replit Secrets or provide spreadsheetId parameter'
      }, { status: 400 });
    }

    // Test Google Sheets API authentication with user's OAuth token
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: (session as any).accessToken });

    const sheets = google.sheets({ version: 'v4', auth });

    // Try to get basic spreadsheet info
    const response = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });

    // List all sheets in the spreadsheet
    const sheetNames = response.data.sheets?.map(sheet => sheet.properties?.title) || [];

    return NextResponse.json({
      success: true,
      spreadsheetId: spreadsheetId,
      spreadsheetTitle: response.data.properties?.title || 'Unknown',
      message: 'Successfully connected to Google Sheets!',
      spreadsheet: {
        title: response.data.properties?.title,
        sheets: sheetNames,
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
      },
      environment: {
        userEmail: session.user?.email,
        hasAccessToken: !!(session as any).accessToken,
        spreadsheetId: spreadsheetId
      }
    });

  } catch (error: any) {
    console.error('Connection test failed:', error);

    let errorMessage = 'Failed to connect to Google Sheets';
    let troubleshooting: string[] = [];

    if (error.message?.includes('authentication') || error.message?.includes('credentials')) {
      errorMessage = 'Authentication failed';
      troubleshooting = [
        'Verify GOOGLE_CLIENT_EMAIL is correct',
        'Check that GOOGLE_PRIVATE_KEY includes the full key with \\n characters',
        'Ensure the service account has access to the spreadsheet'
      ];
    } else if (error.message?.includes('permission') || error.message?.includes('access')) {
      errorMessage = 'Permission denied';
      troubleshooting = [
        'Share the Google Sheets with the service account email',
        'Make sure the service account has at least Viewer permission',
        'Check that the spreadsheet ID is correct'
      ];
    } else if (error.message?.includes('not found')) {
      errorMessage = 'Spreadsheet not found';
      troubleshooting = [
        'Verify the SCL_SPREADSHEET_ID is correct',
        'Check that the spreadsheet exists and is accessible',
        'Make sure you extracted the ID from the correct part of the URL'
      ];
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error.message,
      troubleshooting
    }, { status: 500 });
  }
}
