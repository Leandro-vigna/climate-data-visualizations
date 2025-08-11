import { NextRequest, NextResponse } from 'next/server'

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
}

export async function GET(req: NextRequest) {
  const clientId = process.env.ASANA_CLIENT_ID
  const clientSecret = process.env.ASANA_CLIENT_SECRET
  const redirectUri = process.env.ASANA_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { success: false, error: 'Missing ASANA OAuth envs' },
      { status: 400 }
    )
  }

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code) {
    return NextResponse.json({ success: false, error: 'Missing code' }, { status: 400 })
  }

  // Force redirect to a known safe path on our current origin to avoid localhost issues
  const returnUrl = '/dashboard/analytics'

  // Exchange code for tokens
  const body = new URLSearchParams()
  body.set('grant_type', 'authorization_code')
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)
  body.set('redirect_uri', redirectUri)
  body.set('code', code)

  const tokenResp = await fetch('https://app.asana.com/-/oauth_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })

  if (!tokenResp.ok) {
    const text = await tokenResp.text()
    return NextResponse.json({ success: false, error: 'Token exchange failed', details: text }, { status: 400 })
  }

  const json = (await tokenResp.json()) as TokenResponse

  // For simplicity in this template, store tokens in an httpOnly cookie (short-lived)
  // In production, persist server-side associated with the signed-in user
  const appOrigin = (() => {
    try {
      return new URL(redirectUri).origin
    } catch {
      return new URL(req.url).origin
    }
  })()
  const destUrl = `${appOrigin}${returnUrl}`
  const html = `<!doctype html><html><head><meta charset="utf-8"/><meta http-equiv="refresh" content="0;url='${destUrl}'"/></head><body>
  <p>Returning to the app… If you are not redirected, <a href="${destUrl}">click here</a>.</p>
  <script>try{window.location.replace('${destUrl}')}catch(e){window.location.href='${destUrl}'}</script>
  </body></html>`

  const response = new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  const cookiePayload = Buffer.from(JSON.stringify({
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    obtainedAt: Date.now(),
  })).toString('base64url')

  response.cookies.set('asana_oauth', cookiePayload, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 // 1 hour
  })

  return response
}


