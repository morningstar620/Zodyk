import type { Metadata } from 'next';

import '@zodyk/shared-ui/globals.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zodyk Website',
  description: 'Zodyk public website',
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
