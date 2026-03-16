import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';

const hasGoogleOAuthConfig = Boolean(
  String(process.env.GOOGLE_CLIENT_ID || '').trim() &&
  String(process.env.GOOGLE_CLIENT_SECRET || '').trim()
);

const providers = hasGoogleOAuthConfig
  ? [Google]
  : [
      // Keep auth initialization alive even when .env is missing on shared test setups.
      Credentials({
        name: 'Disabled',
        credentials: {},
        async authorize() {
          return null;
        },
      }),
    ];

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET || 'dev-fallback-secret',
  providers,
  session: {
    strategy: 'jwt',
    // 30 days
    maxAge: 30 * 24 * 60 * 60,
    // refresh JWT age every 24 hours when active
    updateAge: 24 * 60 * 60,
  },
  pages: {
    signIn: '/',
  },
});
