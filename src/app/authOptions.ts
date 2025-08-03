import GoogleProvider from 'next-auth/providers/google';
// Temporarily disable Prisma adapter for OAuth flow
// import { PrismaAdapter } from '@next-auth/prisma-adapter';
// import { prisma } from '../lib/prisma';
import type { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
  // Use JWT strategy instead of database adapter for OAuth
  // adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/analytics.readonly",
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
      if (user) {
        token.id = user.id;
      }
      
      // Store Google Analytics access token
      if (account && account.provider === "google") {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).id = token.id as string;
      }
      
      // Include access token in session for Google Analytics API calls
      (session as any).accessToken = token.accessToken as string;
      
      return session;
    },
  },
}; 