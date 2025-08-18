import { NextRequest, NextResponse } from 'next/server';
import { fetchIndicatorDataFromSharePoint } from '../../../../lib/sharepoint';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { indicatorKey, sourceName } = body;

    if (!indicatorKey || !sourceName) {
      return NextResponse.json({
        success: false,
        error: 'indicatorKey and sourceName are required'
      }, { status: 400 });
    }

    // Normalize indicator key (remove .csv extension if present)
    const normalizedKey = indicatorKey.replace(/\.(csv|xlsx)$/, '');

    // Fetch data from SharePoint
    const result = await fetchIndicatorDataFromSharePoint(normalizedKey, sourceName);

    return NextResponse.json({
      success: !result.error,
      data: result.error ? null : {
        lastUpdatedDate: result.lastUpdatedDate,
        lastAccessedDate: result.lastAccessedDate,
        filePath: result.filePath
      },
      error: result.error || null,
      debug: {
        indicatorKey: normalizedKey,
        sourceName,
        filePath: result.filePath
      }
    });

  } catch (error: any) {
    console.error('Error in fetch-indicator-data API:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch indicator data from SharePoint',
      details: error.message
    }, { status: 500 });
  }
}

// Also support GET for testing
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const indicatorKey = url.searchParams.get('indicatorKey');
  const sourceName = url.searchParams.get('sourceName');

  if (!indicatorKey || !sourceName) {
    return NextResponse.json({
      success: false,
      error: 'indicatorKey and sourceName query parameters are required'
    }, { status: 400 });
  }

  // Reuse POST logic
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ indicatorKey, sourceName }),
    headers: request.headers
  }));
}
