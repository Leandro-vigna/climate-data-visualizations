import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { system, type, url } = body;

    if (!system || !type || !url) {
      return NextResponse.json({
        success: false,
        error: 'system, type, and url are required'
      }, { status: 400 });
    }

    if (type === 'google-doc') {
      // Extract document ID from Google Docs URL
      // Format: https://docs.google.com/document/d/DOCUMENT_ID/edit
      const docIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!docIdMatch) {
        return NextResponse.json({
          success: false,
          error: 'Invalid Google Docs URL. Please provide a full document URL.'
        }, { status: 400 });
      }

      const documentId = docIdMatch[1];

      // ⚠️ SAFETY: READ-ONLY ACCESS ONLY
      // This API uses ONLY read-only scopes and methods.
      // We will NEVER modify, edit, or write to your Google Docs.
      // Only using: documents.get() - which is read-only.
      // NEVER using: documents.create(), documents.batchUpdate(), or any write operations.
      
      // Initialize Google Docs API with READ-ONLY scope
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/documents.readonly'], // READ-ONLY ONLY
      });

      const docs = google.docs({ version: 'v1', auth });

      // SAFETY: Only using documents.get() - this is a READ-ONLY operation
      // This method only retrieves document content, it does NOT modify anything
      const doc = await docs.documents.get({
        documentId: documentId,
      });

      return NextResponse.json({
        success: true,
        documentId: documentId,
        title: doc.data.title,
        message: `Successfully connected to Google Doc: ${doc.data.title}`
      });

    } else {
      return NextResponse.json({
        success: false,
        error: 'Unsupported type. Only "google-doc" is currently supported.'
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error testing write-up connection:', error);
    
    if (error.code === 404) {
      return NextResponse.json({
        success: false,
        error: 'Document not found. Please check the URL and ensure the document is accessible.'
      }, { status: 404 });
    }
    
    if (error.code === 403) {
      return NextResponse.json({
        success: false,
        error: 'Permission denied. Please ensure the service account has access to the document.'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to test connection'
    }, { status: 500 });
  }
}

