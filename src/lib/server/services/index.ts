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
import { RssService } from './RssService';
import { InstagramService } from './social_media/InstagramService';
import { TikTokService } from './social_media/TikTokService';
import { TwitterService } from './social_media/TwitterService';
import { YoutubeService } from './social_media/YoutubeService';
import { TranscriberService } from './TranscriberService';
import { VideoService } from './VideoService';
import { WorkflowJobService } from './WorkflowJobService';
import { WorkflowService } from './WorkflowService';

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
  twitterApi: TwitterApi,
) {
  const youtubeService = new YoutubeService(db, yt, ytOauth2Client, youtubeApi);
  const twitterService = new TwitterService(twitterApi);
  const instagramService = new InstagramService(db, instagramApi);
  const videoService = new VideoService(ai, openai, musicApi);
  const transcriberService = new TranscriberService(db, openai, youtubeService);
  const tiktokService = new TikTokService(tiktokApi);
  const rssService = new RssService();
  const workflow = new WorkflowService(
    db,
    transcriberService,
    videoService,
    youtubeService,
    instagramService,
    rssService,
  );
  const workflowJobs = new WorkflowJobService(
    db,
    transcriberService,
    videoService,
    youtubeService,
    instagramService,
    rssService,
  );
  return {
    workflow,
    workflowJobs,
    transcriber: transcriberService,
    youtube: youtubeService,
    video: videoService,
    tiktok: tiktokService,
    instagram: instagramService,
    twitter: twitterService,
  };
}
