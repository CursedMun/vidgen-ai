import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '$lib/server/trpc/router';

type FetchFn = typeof fetch;

export const createTrpcClient = (fetchFn?: FetchFn) =>
	createTRPCProxyClient<AppRouter>({
		links: [
			httpBatchLink({
				url: '/api/trpc',
				fetch: fetchFn
			})
		]
	});

