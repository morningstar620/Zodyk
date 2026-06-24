import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { connectDatabase, getModels } from '@zodyk/database';
import nodemailer from 'nodemailer';
import type { Provider } from 'next-auth/providers';
import Email from 'next-auth/providers/email';

function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

export function getEmailProvider(): Provider | null {
  if (!isSmtpConfigured()) return null;

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
  });

  return Email({
    server: transport,
    from: process.env.SMTP_FROM,
    async sendVerificationRequest({ identifier, url }) {
      await transport.sendMail({
        to: identifier,
        from: process.env.SMTP_FROM,
        subject: 'Sign in to Zodyk',
        text: `Sign in to Zodyk\n\n${url}\n\nThis link expires in 24 hours.`,
        html: `<p>Sign in to Zodyk</p><p><a href="${url}">Click here to sign in</a></p><p>This link expires in 24 hours.</p>`,
      });
    },
  });
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  if (!isSmtpConfigured()) {
    throw new Error('SMTP is not configured');
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
  });

  await transport.sendMail({
    to: email,
    from: process.env.SMTP_FROM,
    subject: 'Reset your Zodyk password',
    text: `Reset your password\n\n${resetUrl}\n\nThis link expires in 1 hour.`,
    html: `<p>Reset your password</p><p><a href="${resetUrl}">Click here to reset</a></p><p>This link expires in 1 hour.</p>`,
  });
}

export async function findOrCreateUserByEmail(email: string, name?: string) {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  await connectDatabase(uri);
  const { User, Role } = getModels();

  let user = await User.findOne({ email: email.toLowerCase(), tenantId: DEFAULT_TENANT_ID });

  if (!user) {
    const viewerRole = await Role.findOne({ slug: 'viewer', tenantId: DEFAULT_TENANT_ID });
    user = await User.create({
      email: email.toLowerCase(),
      name: name ?? email.split('@')[0],
      status: 'active',
      roleIds: viewerRole ? [viewerRole._id] : [],
      tenantId: DEFAULT_TENANT_ID,
      emailVerified: new Date(),
    });
  }

  return user;
}
