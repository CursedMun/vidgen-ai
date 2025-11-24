import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { RequestEvent } from '@sveltejs/kit';
import { appRouter } from './router';
import { createContext } from './context';

export function trpcHandler(event: RequestEvent) {
	return fetchRequestHandler({
		endpoint: '/api/trpc',
		req: event.request,
		router: appRouter,
		createContext
	});
}

