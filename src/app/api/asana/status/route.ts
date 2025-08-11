import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const c = cookies()
  const token = c.get('asana_oauth')?.value
  return NextResponse.json({
    connected: !!token,
    env: {
      hasClientId: !!process.env.ASANA_CLIENT_ID,
      hasRedirectUri: !!process.env.ASANA_REDIRECT_URI,
      hasClientSecret: !!process.env.ASANA_CLIENT_SECRET,
    },
  })
}


