import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: folderPath } = body;

    if (!folderPath) {
      return NextResponse.json({
        success: false,
        error: 'Folder path is required'
      }, { status: 400 });
    }

    // Check if path exists
    if (!fs.existsSync(folderPath)) {
      return NextResponse.json({
        success: false,
        error: 'Folder path does not exist'
      }, { status: 400 });
    }

    // Check if it's a directory
    const stats = fs.statSync(folderPath);
    if (!stats.isDirectory()) {
      return NextResponse.json({
        success: false,
        error: 'Path is not a directory'
      }, { status: 400 });
    }

    // Try to read the directory (check permissions)
    try {
      const files = fs.readdirSync(folderPath);
      
      // Check if it looks like the right folder structure (has subfolders that might be systems)
      const subfolders = files.filter(file => {
        const fullPath = path.join(folderPath, file);
        return fs.statSync(fullPath).isDirectory();
      });

      return NextResponse.json({
        success: true,
        message: 'Folder path is valid',
        subfolders: subfolders.slice(0, 10), // Return first 10 subfolders as preview
        totalItems: files.length
      });
    } catch (readError: any) {
      return NextResponse.json({
        success: false,
        error: `Cannot read folder: ${readError.message}`
      }, { status: 403 });
    }

  } catch (error: any) {
    console.error('Error testing folder path:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to test folder path'
    }, { status: 500 });
  }
}

