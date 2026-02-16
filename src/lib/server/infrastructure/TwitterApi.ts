import { TwitterApi as XClient } from 'twitter-api-v2';

export interface TwitterKeys {
  appKey: string;
  appSecret: string;
  accessToken: string;
  accessSecret: string;
}

export class TwitterApi {
  private client: XClient;

  constructor(keys: TwitterKeys) {
    this.client = new XClient({
      appKey: keys.appKey,
      appSecret: keys.appSecret,
      accessToken: keys.accessToken,
      accessSecret: keys.accessSecret,
    });
  }
}