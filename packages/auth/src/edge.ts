import NextAuth from 'next-auth';
import { authConfig as edgeAuthConfig } from './auth.config';

export const { auth } = NextAuth(edgeAuthConfig);
