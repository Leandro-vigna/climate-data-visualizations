import { NextRequest, NextResponse } from 'next/server'

function buildAuthorizeUrl(params: { clientId: string; redirectUri: string; state: string }) {
  const url = new URL('https://app.asana.com/-/oauth_authorize')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('state', params.state)
  // Asana requires scopes to be pre-configured in the Developer App and passed here.
  // Use explicit minimal read scopes; allow override via env.
  const scopes = process.env.ASANA_SCOPES || 'projects:read tasks:read users:read workspaces:read custom_fields:read openid email profile'
  url.searchParams.set('scope', scopes)
  return url.toString()
}

export async function GET(req: NextRequest) {
  const clientId = process.env.ASANA_CLIENT_ID
  const redirectUri = process.env.ASANA_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { success: false, error: 'Missing ASANA_CLIENT_ID or ASANA_REDIRECT_URI' },
      { status: 400 }
    )
  }

  const { searchParams } = new URL(req.url)
  const requestedReturn = searchParams.get('returnUrl') || '/dashboard/analytics'
  let returnUrl = '/dashboard/analytics'
  try {
    if (requestedReturn.startsWith('/')) {
      returnUrl = requestedReturn
    } else {
      const u = new URL(requestedReturn, req.url)
      returnUrl = u.pathname + (u.search || '') + (u.hash || '')
    }
  } catch {}

  const statePayload = { t: Date.now(), returnUrl }
  const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url')

  const authorizeUrl = buildAuthorizeUrl({ clientId, redirectUri, state })
  const response = NextResponse.redirect(authorizeUrl)
  response.cookies.set('asana_return', returnUrl, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 10 * 60, // 10 minutes
  })
  return response
}


