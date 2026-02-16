import { configureApp } from '@/server';
import { appRouter } from '@/server/api/trpc/root';
import type { Handle, RequestEvent } from '@sveltejs/kit';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
export const trpcPathBase = '/api/trpc';
export function trpcHandler(event: RequestEvent) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: event.request,
    router: appRouter,
    createContext: () => configureApp(event),
    allowBatching: true,
    responseMeta(opts) {
      return {
        headers: {
          'Set-Cookie': event.cookies.serialize('tw_oauth_secret', opts.ctx?.cookies.get('tw_oauth_secret') ?? '', {
             path: '/',
             httpOnly: true,
             sameSite: 'lax',
             secure: false, // localhost
             maxAge: 60 * 10
          })
        }
      }
    }
  });
}
export const handle: Handle = async ({ event, resolve }) => {
  if (
    event.url.pathname.startsWith(`${trpcPathBase}/`) &&
    (event.request.method === 'GET' || event.request.method === 'POST')
  ) {
    console.log(event.url.pathname, 'path');
    return trpcHandler(event);
  }
  return resolve(event);
};
