import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';

import '@zodyk/shared-ui/globals.css';
import './globals.css';
import { Providers } from '../components/providers';

export const metadata: Metadata = {
  title: 'Zodyk Admin',
  description: 'Zodyk administration panel',
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
    <html lang="en" className={GeistSans.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased" suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var t=localStorage.getItem('theme');var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);d.classList.toggle('dark',dark)}catch(e){}})();`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
