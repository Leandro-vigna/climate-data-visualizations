# Google Analytics OAuth 2.0 Setup Guide

## 🎯 Goal
Set up OAuth 2.0 so you can access Climate Watch Google Analytics data using your own Google account credentials.

## Step 1: Google Cloud Console Setup

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select your project**: `climate-watch-436816` (or create new one)
3. **Enable APIs**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Analytics Reporting API" → Enable it
   - Search for "Google Analytics Data API" → Enable it

## Step 2: Create OAuth 2.0 Credentials

1. **Go to Credentials**: "APIs & Services" → "Credentials"
2. **Click "Create Credentials"** → "OAuth 2.0 Client IDs"
3. **Configure OAuth consent screen** (if prompted):
   - User Type: External (if not in organization) or Internal
   - App name: "Climate Watch Analytics"
   - User support email: your email
   - Scopes: Add `https://www.googleapis.com/auth/analytics.readonly`
4. **Create OAuth Client**:
   - Application type: "Web application"
   - Name: "Climate Watch Analytics"
   - Authorized redirect URIs: 
     - `http://localhost:3000/api/auth/callback/google`
     - `https://d211a386-9098-4839-b6d4-2a73b149a409-00-1ukbkh51btphf.spock.replit.dev/api/auth/callback/google`
     
   **⚠️ IMPORTANT: Your Replit URL changes each restart. Update this URL in Google Cloud Console when your Replit URL changes!**

## Step 3: Get Your Credentials

After creating, you'll get:
- **Client ID**: `xxxxx.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-xxxxx`

## Step 4: Add to Replit Secrets

Add these new secrets in Replit:
- `GOOGLE_CLIENT_ID` = your client ID  
- `GOOGLE_CLIENT_SECRET` = your client secret
- `NEXTAUTH_SECRET` = any random string (for session security)

**✅ These are already configured in your Replit environment!**

## Step 5: Test the Setup

Once configured, you'll:
1. Click "Connect Google Analytics" in the app
2. Sign in with your Google account (the one with GA access)
3. Grant permissions for analytics access
4. App will use your token to fetch Climate Watch data

## Benefits of OAuth vs Service Account

✅ **Uses YOUR existing permissions** - no admin access needed
✅ **Real-time authentication** - works immediately  
✅ **User-friendly** - just sign in with Google
✅ **Secure** - tokens can be revoked anytime
✅ **Flexible** - works with any GA account you have access to

## Next Steps

After setup, the app will:
- Store your OAuth token securely
- Refresh tokens automatically
- Access Climate Watch GA data using your permissions
- Work exactly like before but with proper authentication! 