import { NextResponse } from 'next/server';
import { ensureDefaultSunburstData } from '../../../../lib/firebase/firebaseUtils';

export async function POST() {
  try {
    const result = await ensureDefaultSunburstData();
    return NextResponse.json({ 
      success: true, 
      message: result ? 'Default data created/updated' : 'Default data already exists',
      dataUpdated: result 
    });
  } catch (error) {
    console.error('Error ensuring default sunburst data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to ensure default data' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await ensureDefaultSunburstData();
    return NextResponse.json({ 
      success: true, 
      message: result ? 'Default data created/updated' : 'Default data already exists',
      dataUpdated: result 
    });
  } catch (error) {
    console.error('Error ensuring default sunburst data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to ensure default data' },
      { status: 500 }
    );
  }
} 