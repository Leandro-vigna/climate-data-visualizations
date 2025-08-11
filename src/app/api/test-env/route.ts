import { NextResponse } from 'next/server';

export async function GET() {
  function mask(value?: string | null, showStart: number = 4, showEnd: number = 4): string {
    if (!value) {
      return 'NOT FOUND';
    }
    const str = String(value);
    if (str.length <= showStart + showEnd) {
      return '*'.repeat(str.length);
    }
    return `${str.slice(0, showStart)}...${str.slice(-showEnd)}`;
  }

  return NextResponse.json({
    GOOGLE_ANALYTICS_CLIENT_EMAIL: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL || 'NOT FOUND',
    GOOGLE_ANALYTICS_VIEW_ID: process.env.GOOGLE_ANALYTICS_VIEW_ID || 'NOT FOUND', 
    GOOGLE_ANALYTICS_PRIVATE_KEY_EXISTS: !!process.env.GOOGLE_ANALYTICS_PRIVATE_KEY,
    ASANA_CLIENT_ID: mask(process.env.ASANA_CLIENT_ID),
    ASANA_CLIENT_SECRET_EXISTS: !!process.env.ASANA_CLIENT_SECRET,
    ASANA_REDIRECT_URI: process.env.ASANA_REDIRECT_URI || 'NOT FOUND',
    ALL_ENV_KEYS: Object.keys(process.env).filter(key => key.includes('GOOGLE') || key.includes('ASANA'))
  });
}