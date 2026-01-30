import type { GoogleGenAI } from '@google/genai';
import type { TwitterApi } from 'twitter-api-v2';
import type Innertube from 'youtubei.js';
import type { TDatabase } from '../infrastructure/db/client';
import type { InstagramApi } from '../infrastructure/InstagramApi';
import type { TiktokApi } from '../infrastructure/TiktokApi';
import type { TopMediAiApi } from '../infrastructure/TopMediAiApi';
import type { YoutubeApi } from '../infrastructure/YoutubeAPI';
import { InstagramService } from './InstagramService';
import { SchedulerService } from './SchedulerService';
import { TikTokService } from './TikTokService';
import { TranscriberService } from './TranscriberService';
import { TwitterService } from './TwitterService';
import { VideoService } from './VideoService';
import { YoutubeService } from './YoutubeService';

export function configureServices(
  db: TDatabase,
  ai: GoogleGenAI,
  yt: Innertube,
  youtubeApi: YoutubeApi,
  musicApi: TopMediAiApi,
  tiktokApi: TiktokApi,
  instagramApi: InstagramApi,
  twitterApi: TwitterApi
) {
  const youtubeService = new YoutubeService(db, yt, youtubeApi);
  const twitterService = new TwitterService(twitterApi)
  const instagramService = new InstagramService(instagramApi);
  const videoService = new VideoService(db, ai, musicApi, twitterService, instagramService);
  const transcriberService = new TranscriberService(db, ai, youtubeService);
  const tiktokService = new TikTokService(tiktokApi);
  return {
    scheduler: new SchedulerService(db, transcriberService, youtubeService),
    transcriber: transcriberService,
    youtube: youtubeService,
    video: videoService,
    tiktok: tiktokService,
    instagram: instagramService,
    twitter: twitterService
  };
}
