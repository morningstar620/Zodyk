import type { Metadata } from 'next';

import '@zodyk/shared-ui/globals.css';
import './globals.css';
import { Providers } from '../components/providers';

export const metadata: Metadata = {
  title: 'Zodyk Admin',
  description: 'Zodyk administration panel',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
