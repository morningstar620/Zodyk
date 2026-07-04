'use client';

import { SessionProvider } from 'next-auth/react';
import { SWRConfig } from 'swr';
import { FeedbackProvider } from '@zodyk/shared-ui/feedback';
import { ThemeProvider } from '@/components/theme-provider';
import { apiFetcher } from '@/lib/api-fetcher';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <FeedbackProvider>
          <SWRConfig
            value={{
              fetcher: apiFetcher,
              revalidateOnFocus: false,
              dedupingInterval: 5_000,
              keepPreviousData: true,
              errorRetryCount: 2,
            }}
          >
            {children}
          </SWRConfig>
        </FeedbackProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
