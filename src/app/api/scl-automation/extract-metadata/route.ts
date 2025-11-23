import { NextRequest, NextResponse } from 'next/server';
import { extractMetadataFromExcelFile } from '../../../../lib/sharepoint';

export async function POST(request: NextRequest) {
  let indicatorKey: string = '';
  let system: string = '';
  
  try {
    const body = await request.json();
    indicatorKey = body.indicatorKey;
    system = body.system;
    const customBasePath = body.basePath; // Optional custom path from UI

    if (!indicatorKey || !system) {
      return NextResponse.json({
        success: false,
        error: 'indicatorKey and system are required'
      }, { status: 400 });
    }

    // Extract metadata from Excel file (reads from local filesystem)
    const metadata = await extractMetadataFromExcelFile(indicatorKey, system, customBasePath);

    // Serialize Date objects to ISO strings for JSON response
    const serializedMetadata = {
      ...metadata,
      extractedAt: metadata.extractedAt instanceof Date 
        ? metadata.extractedAt.toISOString() 
        : metadata.extractedAt
    };

    return NextResponse.json({
      success: true,
      metadata: serializedMetadata
    });

  } catch (error: any) {
    console.error('Error in extract-metadata API:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to extract metadata';
    const fileKey = indicatorKey || 'unknown';
    const systemName = system || 'unknown';
    
    if (error?.message?.includes('not found') || error?.message?.includes('File not found')) {
      errorMessage = `File not found: ${fileKey}.xlsx in the ${systemName} folder. Please ensure:
        - The file is synced locally via OneDrive
        - The system folder name matches exactly (e.g., "Finance", "Energy")
        - The file name matches the indicator key (e.g., "X-FIN-85.xlsx")`;
    } else if (error?.message?.includes('No Notes tab')) {
      errorMessage = `The Excel file ${fileKey}.xlsx does not have a "Notes" tab. Please ensure the file has a sheet named "Notes" (case-insensitive).`;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

// Also support GET for testing
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const indicatorKey = url.searchParams.get('indicatorKey');
  const system = url.searchParams.get('system');

  if (!indicatorKey || !system) {
    return NextResponse.json({
      success: false,
      error: 'indicatorKey and system query parameters are required'
    }, { status: 400 });
  }

  // Reuse POST logic
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ indicatorKey, system }),
    headers: request.headers
  }));
}

