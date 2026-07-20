import type { Metadata } from 'next';

import '@zodyk/shared-ui/globals.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zodyk Website',
  description: 'Zodyk public website',
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
