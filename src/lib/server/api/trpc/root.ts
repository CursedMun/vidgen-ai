import { router } from '@/server/infrastructure/trpc/server';
import { channelsRouter } from './routers/channels';
import { jobsRouter } from './routers/jobs';
import { transcriberRouter } from './routers/transcriber';

export const appRouter = router({
  channels: channelsRouter,
  transcriber: transcriberRouter,
  jobs: jobsRouter,
});

export type AppRouter = typeof appRouter;
