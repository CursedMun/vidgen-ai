import { GoogleGenAI } from '@google/genai';
import Innertube, { Platform, type Types, UniversalCache } from 'youtubei.js';
import { db, type TDatabase } from './infrastructure/db/client';
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

  const ai = new GoogleGenAI({
    apiKey:
      process.env.GEMINI_API_KEY || 'AIzaSyACQ_whayPZ2PqVr0Cn8XCCCwMEYeAf3AU',
  });

  rawApp = {
    services: configureServices(db, ai, yt, youtubeApi),
    db: db,
  };
  return rawApp;
}

export type TApp = Awaited<ReturnType<typeof configureApp>>;
