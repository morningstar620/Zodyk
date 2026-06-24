'use client';

import useSWR, { type SWRConfiguration, mutate } from 'swr';
import { apiFetcher } from '@/lib/api-fetcher';

export function useApi<T>(key: string | null, config?: SWRConfiguration<T>) {
  return useSWR<T>(key, apiFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5_000,
    keepPreviousData: true,
    ...config,
  });
}

export function invalidateApi(prefix: string): void {
  void mutate((key) => typeof key === 'string' && key.startsWith(prefix), undefined, {
    revalidate: true,
  });
}

export { mutate as mutateApi };
