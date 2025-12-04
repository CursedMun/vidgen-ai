import { configureApp, type TApp } from '@/server';
import { appRouter } from '@/server/api/trpc/root';
import type { RequestEvent } from '@sveltejs/kit';
import { initTRPC } from '@trpc/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';


export function trpcHandler(event: RequestEvent) {
	return fetchRequestHandler({
		endpoint: '/api/trpc',
		req: event.request,
		router: appRouter,
		createContext: configureApp,
		allowBatching: true
	});
}

const t = initTRPC.context<TApp>().create()
export const router = t.router;
export const publicProcedure = t.procedure;
const authorized = () =>
  t.procedure.use((opts) => {
    return opts.next({
      ctx: {
        ...opts.ctx,
        // auth: opts.ctx.auth,
      },
    });
  });
export const protectedProcedure = {
  // acl,
  authorized,
};