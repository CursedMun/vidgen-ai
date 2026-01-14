import type { GoogleGenAI } from '@google/genai';
import type Innertube from 'youtubei.js';
import type { TDatabase } from '../infrastructure/db/client';
import type { YoutubeApi } from '../infrastructure/YoutubeAPI';
import { SchedulerService } from './SchedulerService';
import { TranscriberService } from './TranscriberService';
import { VideoService } from './VideoService';
import { YoutubeService } from './YoutubeService';

export function configureServices(
  db: TDatabase,
  ai: GoogleGenAI,
  yt: Innertube,
  youtubeApi: YoutubeApi,
) {
  const youtubeService = new YoutubeService(db, yt, youtubeApi);
  const videoService = new VideoService(db, ai);
  const transcriberService = new TranscriberService(db, ai, youtubeService, videoService);
  return {
    scheduler: new SchedulerService(db, transcriberService, youtubeService),
    transcriber: transcriberService,
    youtube: youtubeService,
    video: videoService,
  };
}
