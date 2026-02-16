import path from 'node:path';
import type { TiktokApi } from '../infrastructure/TiktokApi';

export class TikTokService {
  constructor(private tiktokApi: TiktokApi) {}

  public async uploadToTikTok(videoPath: string, title: string) {
    const absolutePath = path.resolve(videoPath);

    try {
      const initRes = await this.tiktokApi.uploadToDrafts(
        absolutePath,
        title,
      );
      console.log('initRes: ', initRes);
    } catch (error) {
      console.error('Error uploadToTikTok:', error);
      throw error;
    }
  }
}