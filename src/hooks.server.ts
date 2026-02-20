import { configureApp, initCore } from '@/server';
import { AutomationWorker } from '@/server/AutomationWorker';
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
async function startAutomation() {
  if (global.__automation_worker_running) {
    return;
  }
  const { services, db } = await initCore();
  const worker = new AutomationWorker(
    db,
    services.transcriber,
    services.video,
    services.youtube,
    services.instagram
  );

  global.__automation_worker_running = setInterval(async () => {
    try {
      await worker.processPendingCrons();
    } catch (err) {
      console.error("Error Worker:", err);
    }
  }, 60000);
}
if (!global.__worker) {
  startAutomation();
  global.__worker = true;
}
export const handle: Handle = async ({ event, resolve }) => {
  event.locals.createContext = async (e: RequestEvent) => configureApp(e);
  if (
    event.url.pathname.startsWith(`${trpcPathBase}/`) &&
    (event.request.method === 'GET' || event.request.method === 'POST')
  ) {
    console.log(event.url.pathname, 'path');
    return trpcHandler(event);
  }
  return resolve(event);
};
