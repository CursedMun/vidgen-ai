import type { AppRouter } from '@/server/api/trpc/root';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

type FetchFn = typeof fetch;

export const createTrpcClient = (fetchFn?: FetchFn) =>
  createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        fetch: fetchFn,
      }),
    ],
  });
