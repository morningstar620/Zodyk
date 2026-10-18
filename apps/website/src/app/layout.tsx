import type { Metadata } from 'next';
import { sanitizeSiteUrl } from '@zodyk/seo';

import '@zodyk/shared-ui/globals.css';
import './globals.css';

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Zodyk';
const siteUrl = sanitizeSiteUrl(process.env.WEBSITE_URL ?? process.env.NEXT_PUBLIC_WEBSITE_URL);

export const metadata: Metadata = {
  metadataBase: new URL(`${siteUrl}/`),
  title: {
    default: siteName,
    template: '%s',
  },
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION ?? siteName,
  icons: {
    icon: [
      { url: '/logo-light.svg', media: '(prefers-color-scheme: light)', type: 'image/svg+xml' },
      { url: '/logo-dark.svg', media: '(prefers-color-scheme: dark)', type: 'image/svg+xml' },
    ],
    shortcut: '/logo-light.svg',
    apple: '/logo-light.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
