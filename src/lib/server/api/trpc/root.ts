import { router } from '@/server/infrastructure/trpc/server';
import { channelsRouter } from './routers/channels';
import { jobsRouter } from './routers/jobs';
import { transcriberRouter } from './routers/transcriber';
import { videoRouter } from './routers/videos';

export const appRouter = router({
  channels: channelsRouter,
  transcriber: transcriberRouter,
  jobs: jobsRouter,
  videos: videoRouter,
});

export type AppRouter = typeof appRouter;
