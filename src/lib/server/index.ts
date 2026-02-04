import { GoogleGenAI } from '@google/genai';
import { TwitterApi } from 'twitter-api-v2';
import Innertube, { Platform, type Types, UniversalCache } from 'youtubei.js';
import { db, type TDatabase } from './infrastructure/db/client';
import { InstagramApi } from './infrastructure/InstagramApi';
import { TiktokApi } from './infrastructure/TiktokApi';
import { TopMediAiApi } from './infrastructure/TopMediAiApi';
import { YoutubeApi } from './infrastructure/YoutubeAPI';
import { configureServices } from './services';
export type TApplication = {
  services: Awaited<ReturnType<typeof configureServices>>;
  db: TDatabase;
};

let rawApp: TApplication | undefined;

export async function configureApp() {
  if (rawApp) {
    return rawApp;
  }
  const yt = await Innertube.create({ cache: new UniversalCache(true) });
  Platform.shim.eval = async (
    data: Types.BuildScriptResult,
    env: Record<string, Types.VMPrimative>,
  ) => {
    const properties = [];

    if (env.n) {
      properties.push(`n: exportedVars.nFunction("${env.n}")`);
    }

    if (env.sig) {
      properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
    }

    const code = `${data.output}\nreturn { ${properties.join(', ')} }`;

    return new Function(code)();
  };
  const youtubeApi = new YoutubeApi(
    process.env.YOUTUBE_API_KEY || 'AIzaSyBvjeyozJDDU9rGqMeEKAEuDOK4QBaxqog',
  );

  const TOPMEDIAI_API_KEY = '14b3f45455e74a8c9951ad2fff10f6fe'; // passar para env

  const topMediaApi = new TopMediAiApi(TOPMEDIAI_API_KEY);

  const TIKTOK_API_KEY = '14b3f45455e74a8c9951ad2fff10f6fe'; // passar para env
  const TIKTOK_ClIENT_SECRET = '14b3f45455e74a8c9951ad2fff10f6fe'; // passar para env
  const TIKTOK_REDIRECT = '14b3f45455e74a8c9951ad2fff10f6fe'; // passar para env
  const tiktokApi = new TiktokApi(
    TIKTOK_API_KEY,
    TIKTOK_ClIENT_SECRET,
    TIKTOK_REDIRECT,
  );

  const INSTAGRAM_ACCOUNT = '17841480006005592'; // passar para env
  const INSTAGRAM_API_KEY = 'EAAQZCZAMXbbcMBQsZACtk0qiqCgLMwB5QnewlszIeMqhZCWFI8Vf2ZC0MpwpacdRKKiIa5ZBKi0t2g0HMZCdCobqjZBmt11Pq9uqAos45YDYisZCYZBO6FsZCv1C153CrCMROHX6oWvQhufAk3e83B5OVCvCu4akKCrLlDPQNpJskwTxpgFD1OhulYZA6R6pDNVxxn5oMeVA9haj9U8vRZBP2icZCjjrDIy2jZC29y3Jdbv5kyGmg9EOiCJSPKMJUyOfjPSZA6HCwFYZCoLQgWji9HeCl';
  const instagramApi = new InstagramApi(INSTAGRAM_ACCOUNT, INSTAGRAM_API_KEY);

  const X_APP_KEY = '9XmHC6JpVKjJkMygGxWvK2CsZ';
  const X_APP_SECRET = 'otKbomju5c3fLaATSyPFmfRtNhmaDCeOjfPFhbGZTkKXkO5q2E';
  const X_ACCESS_TOKEN = '2015817398767464448-NNJvabzq3WrMNp8E9IM1anYgA05uAW';
  const X_ACCESS_SECRET = 'ab0ZJG5mBhL11YVHQPGNJjcj5Wda1V6DKWUKIo2zDn8RC';

  const twitterApi = new TwitterApi({
    appKey: X_APP_KEY,
    appSecret: X_APP_SECRET,
    accessToken: X_ACCESS_TOKEN,
    accessSecret: X_ACCESS_SECRET,
  });
  console.log('process.env.GEMINI_API_KEY: ', process.env.GEMINI_API_KEY);
  const ai = new GoogleGenAI({
    apiKey:
      process.env.GEMINI_API_KEY || 'AIzaSyB-97LJ3okGj_PvTDb0V03pF9xXuOBPRoY',
  });

  rawApp = {
    services: configureServices(
      db,
      ai,
      yt,
      youtubeApi,
      topMediaApi,
      tiktokApi,
      instagramApi,
      twitterApi,
    ),
    db: db,
  };
  return rawApp;
}

export type TApp = Awaited<ReturnType<typeof configureApp>>;
