import {
  GEMINI_API_KEY,
  OPENAI_API_KEY,
  TIKTOK_API_KEY,
  TIKTOK_ClIENT_SECRET,
  TIKTOK_REDIRECT,
  TOPMEDIAI_API_KEY,
  X_APP_KEY,
  X_APP_SECRET,
  YOUTUBE_API_KEY,
  YT_CLIENT_ID,
  YT_CLIENT_SECRET,
  YT_REDIRECT_URI,
  YT_REFRESH_TOKEN
} from '$env/static/private';
import { GoogleGenAI } from '@google/genai';
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { google } from 'googleapis';
import { OpenAI } from 'openai';
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
  cookies: Cookies
};

let rawApp: TApplication | undefined;

let appInstance: { services: ReturnType<typeof configureServices>; db: TDatabase } | undefined;

export async function initCore() {
  if (appInstance) return appInstance;

  const yt = await Innertube.create({ cache: new UniversalCache(true) });
  const ytOauth2Client = new google.auth.OAuth2(YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REDIRECT_URI);

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const youtubeApi = new YoutubeApi(YOUTUBE_API_KEY);
  const topMediaApi = new TopMediAiApi(TOPMEDIAI_API_KEY);
  const tiktokApi = new TiktokApi(TIKTOK_API_KEY, TIKTOK_ClIENT_SECRET, TIKTOK_REDIRECT);
  const instagramApi = new InstagramApi();
  const twitterApi = new TwitterApi({ appKey: X_APP_KEY, appSecret: X_APP_SECRET });

  appInstance = {
    services: configureServices(
      db, ai, openai, yt, ytOauth2Client,
      youtubeApi, topMediaApi, tiktokApi, instagramApi, twitterApi
    ),
    db: db
  };

  return appInstance;
}

export async function configureApp(event: RequestEvent) {
  if (rawApp) {
    return rawApp;
  }
  const yt = await Innertube.create({ cache: new UniversalCache(true) });


const ytOauth2Client = new google.auth.OAuth2(
  YT_CLIENT_ID,
  YT_CLIENT_SECRET,
  YT_REDIRECT_URI
);

// Refresh Token
ytOauth2Client.setCredentials({
  refresh_token: YT_REFRESH_TOKEN
});

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
    YOUTUBE_API_KEY,
  );

  const topMediaApi = new TopMediAiApi(TOPMEDIAI_API_KEY);

  const tiktokApi = new TiktokApi(
    TIKTOK_API_KEY,
    TIKTOK_ClIENT_SECRET,
    TIKTOK_REDIRECT,
  );

  const instagramApi = new InstagramApi();


  const twitterApi = new TwitterApi({
    appKey: X_APP_KEY,
    appSecret: X_APP_SECRET
  });

  const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY
  });

  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
  });



  rawApp = {
    services: configureServices(
      db,
      ai,
      openai,
      yt,
      ytOauth2Client,
      youtubeApi,
      topMediaApi,
      tiktokApi,
      instagramApi,
      twitterApi,
    ),
    db: db,
    cookies: event.cookies
  };
  return rawApp;
}

export type TApp = Awaited<ReturnType<typeof configureApp>>;
