import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    GOOGLE_ANALYTICS_CLIENT_EMAIL: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL || 'NOT FOUND',
    GOOGLE_ANALYTICS_VIEW_ID: process.env.GOOGLE_ANALYTICS_VIEW_ID || 'NOT FOUND', 
    GOOGLE_ANALYTICS_PRIVATE_KEY_EXISTS: !!process.env.GOOGLE_ANALYTICS_PRIVATE_KEY,
    ALL_ENV_KEYS: Object.keys(process.env).filter(key => key.includes('GOOGLE'))
  });
}