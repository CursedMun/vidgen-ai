import { createCaller } from '@/server/api/trpc/root';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
  const code = event.url.searchParams.get('code');

  if (code) {
    try {
      const ctx = await event.locals.createContext(event);
      const caller = createCaller(ctx);
      await caller.youtube.saveAccount({ code });
      console.log('Conta YouTube guardada com sucesso no SQLite!');
    } catch (err) {
      console.error('Erro ao processar token do YouTube:', err);
      throw redirect(302, '/social?error=auth_failed');
    }
  }

  throw redirect(302, '/social?success=youtube_connected');
};
