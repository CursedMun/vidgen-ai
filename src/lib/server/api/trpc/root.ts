import { createCallerFactory, router } from '@/server/infrastructure/trpc/server';
import { channelsRouter } from './routers/channels';
import { jobsRouter } from './routers/jobs';
import { presetRouter } from './routers/preset';
import { publicationRouter } from './routers/publication';
import { transcriberRouter } from './routers/transcriber';
import { videoRouter } from './routers/videos';
import { youtubeAuthRouter } from './routers/youtubeAuth';

export const appRouter = router({
  channels: channelsRouter,
  transcriber: transcriberRouter,
  jobs: jobsRouter,
  videos: videoRouter,
  presets: presetRouter,
  youtube: youtubeAuthRouter,
  publication: publicationRouter
});

export const createCaller = createCallerFactory(appRouter);
export type AppRouter = typeof appRouter;
