import GoogleProvider from 'next-auth/providers/google';
// Temporarily disable Prisma adapter for OAuth flow
// import { PrismaAdapter } from '@next-auth/prisma-adapter';
// import { prisma } from '../lib/prisma';
import type { NextAuthOptions } from 'next-auth';

interface ExtendedToken {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number; // epoch ms
  id?: string;
  [key: string]: unknown;
}

async function refreshAccessToken(token: ExtendedToken): Promise<ExtendedToken> {
  try {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken || '',
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Failed to refresh Google access token: ${res.status} ${errorBody}`);
    }

    const refreshed = await res.json();

    const expiresInSeconds: number = refreshed.expires_in || 3600;

    return {
      ...token,
      accessToken: refreshed.access_token as string,
      accessTokenExpires: Date.now() + expiresInSeconds * 1000,
      // Google may or may not return a new refresh token; fall back to existing
      refreshToken: (refreshed.refresh_token as string) || token.refreshToken,
    };
  } catch (error) {
    console.error('Error refreshing Google access token', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    } as ExtendedToken;
  }
}

export const authOptions: NextAuthOptions = {
  // Use JWT strategy instead of database adapter for OAuth
  // adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/analytics https://www.googleapis.com/auth/spreadsheets.readonly",
          access_type: "offline",
          prompt: "consent"
        }
      }
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      const extToken = token as unknown as ExtendedToken;

      if (user) {
        extToken.id = (user as any).id;
      }

      // Initial sign-in
      if (account && account.provider === 'google') {
        const expiresAtSeconds = (account.expires_at as number) || 0;
        extToken.accessToken = account.access_token as string;
        extToken.refreshToken = (account.refresh_token as string) || extToken.refreshToken;
        extToken.accessTokenExpires = expiresAtSeconds
          ? expiresAtSeconds * 1000
          : Date.now() + 60 * 60 * 1000; // default 1h
        return extToken as any;
      }

      // Return previous token if the access token has not expired yet
      if (extToken.accessToken && extToken.accessTokenExpires && Date.now() < extToken.accessTokenExpires) {
        return extToken as any;
      }

      // Access token has expired, try to refresh it
      if (extToken.refreshToken) {
        const refreshed = await refreshAccessToken(extToken);
        return refreshed as any;
      }

      // No refresh token available; return token as-is (will cause 401 and prompt re-login)
      return extToken as any;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).id = token.id as string;
      }
      
      // Include access token in session for Google Analytics API calls
      (session as any).accessToken = (token as any).accessToken as string;
      
      return session;
    },
  },
}; 