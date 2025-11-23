import { NextRequest, NextResponse } from 'next/server';
import { parseGoogleDocWriteUp, parseWordDocWriteUp } from '@/lib/writeup-parser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { system, indicatorId, type, documentId } = body;

    if (!system || !indicatorId) {
      return NextResponse.json({
        success: false,
        error: 'system and indicatorId are required'
      }, { status: 400 });
    }

    let writeUpInfo;

    if (type === 'google-doc' && documentId) {
      // ⚠️ SAFETY: parseGoogleDocWriteUp uses READ-ONLY access only
      // Your Google Doc will NOT be modified in any way
      writeUpInfo = await parseGoogleDocWriteUp(documentId, indicatorId);
    } else if (type === 'word-doc') {
      writeUpInfo = await parseWordDocWriteUp(system, indicatorId);
    } else {
      // Try to determine type from localStorage config
      // For now, return error - the client should pass the type
      return NextResponse.json({
        success: false,
        error: 'type and documentId (for Google Docs) are required'
      }, { status: 400 });
    }

    if (!writeUpInfo) {
      return NextResponse.json({
        success: false,
        error: `Indicator ${indicatorId} not found in ${system} write-up document`
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      writeUpInfo
    });

  } catch (error: any) {
    console.error('Error extracting write-up info:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to extract write-up information'
    }, { status: 500 });
  }
}

