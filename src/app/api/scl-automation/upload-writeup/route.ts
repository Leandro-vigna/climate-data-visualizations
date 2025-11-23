import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Directory to store uploaded Word documents
const WRITEUP_STORAGE_DIR = path.join(process.cwd(), 'storage', 'writeups');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const system = formData.get('system') as string;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }

    if (!system) {
      return NextResponse.json({
        success: false,
        error: 'System name is required'
      }, { status: 400 });
    }

    // Validate file type
    const fileName = file.name;
    const fileExtension = path.extname(fileName).toLowerCase();
    if (!['.docx', '.doc'].includes(fileExtension)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Please upload a .docx or .doc file.'
      }, { status: 400 });
    }

    // Ensure storage directory exists
    if (!existsSync(WRITEUP_STORAGE_DIR)) {
      await mkdir(WRITEUP_STORAGE_DIR, { recursive: true });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save file (replace if exists)
    const sanitizedSystem = system.replace(/[^a-zA-Z0-9-_]/g, '_');
    const savedFileName = `${sanitizedSystem}${fileExtension}`;
    const filePath = path.join(WRITEUP_STORAGE_DIR, savedFileName);

    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      filePath: filePath,
      fileName: savedFileName,
      system: system,
      message: `Word document uploaded successfully for ${system}`
    });

  } catch (error: any) {
    console.error('Error uploading write-up:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to upload file'
    }, { status: 500 });
  }
}

