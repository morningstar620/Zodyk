'use client';

import { SessionProvider } from 'next-auth/react';
import { SWRConfig } from 'swr';
import { apiFetcher } from '@/lib/api-fetcher';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
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
    </SessionProvider>
  );
}
