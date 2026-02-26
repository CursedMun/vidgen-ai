import {
  createCallerFactory,
  router,
} from '@/server/infrastructure/trpc/server';
import { accountRouter } from './routers/account';
import { assetRouter } from './routers/asset';
import { presetRouter } from './routers/preset';
import { promptRouter } from './routers/prompt';
import { sourceRouter } from './routers/source';
import { transcriberRouter } from './routers/transcriber';
import { videoRouter } from './routers/videos';
import { workflowRouter } from './routers/workflow';
import { workflowJobsPerDayRouter } from './routers/workflow-jobs-per-day';
import { youtubeAuthRouter } from './routers/youtubeAuth';

export const appRouter = router({
  accounts: accountRouter,
  assets: assetRouter,
  presets: presetRouter,
  prompts: promptRouter,
  sources: sourceRouter,
  transcriber: transcriberRouter,
  videos: videoRouter,
  workflows: workflowRouter,
  workflowJobsPerDay: workflowJobsPerDayRouter,
  youtube: youtubeAuthRouter,
});

export const createCaller = createCallerFactory(appRouter);
export type AppRouter = typeof appRouter;
