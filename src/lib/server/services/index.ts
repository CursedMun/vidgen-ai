import type { GoogleGenAI } from '@google/genai';
import type { Auth } from 'googleapis';
import type { OpenAI } from 'openai';
import type { TwitterApi } from 'twitter-api-v2';
import type Innertube from 'youtubei.js';
import type { TDatabase } from '../infrastructure/db/client';
import type { InstagramApi } from '../infrastructure/InstagramApi';
import type { TiktokApi } from '../infrastructure/TiktokApi';
import type { TopMediAiApi } from '../infrastructure/TopMediAiApi';
import type { YoutubeApi } from '../infrastructure/YoutubeAPI';
import { AutomationService } from './AutomationService';
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
  openai: OpenAI,
  yt: Innertube,
  ytOauth2Client: Auth.OAuth2Client,
  youtubeApi: YoutubeApi,
  musicApi: TopMediAiApi,
  tiktokApi: TiktokApi,
  instagramApi: InstagramApi,
  twitterApi: TwitterApi
) {
  const youtubeService = new YoutubeService(db, yt, ytOauth2Client, youtubeApi);
  const twitterService = new TwitterService(twitterApi)
  const instagramService = new InstagramService(db, instagramApi);
  const videoService = new VideoService(ai, openai, musicApi, twitterService, instagramService, youtubeService);
  const transcriberService = new TranscriberService(db, openai, youtubeService);
  const tiktokService = new TikTokService(tiktokApi);
  const automationService = new AutomationService(db);
  return {
    scheduler: new SchedulerService(db, transcriberService, youtubeService),
    transcriber: transcriberService,
    youtube: youtubeService,
    video: videoService,
    tiktok: tiktokService,
    instagram: instagramService,
    twitter: twitterService,
    automation: automationService
  };
}
