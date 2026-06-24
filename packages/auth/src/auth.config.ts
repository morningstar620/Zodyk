import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;

declare module 'next-auth' {
  interface Session {
    userId: string;
    roleIds: string[];
    permissions: string[];
    tenantId: string;
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
    };
  }

  interface User {
    id: string;
  }
}
