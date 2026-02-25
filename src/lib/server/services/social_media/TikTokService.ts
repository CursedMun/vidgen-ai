import path from 'node:path';
import type { TiktokApi } from '../../infrastructure/TiktokApi';
import {
  BaseSocialMedia,
  type UploadOptions,
  type UploadResult,
} from './BaseSocialMedia';

export class TikTokService extends BaseSocialMedia {
  constructor(private tiktokApi: TiktokApi) {
    super();
  }

  public getPlatform(): string {
    return 'tiktok';
  }

  public async upload(options: UploadOptions): Promise<UploadResult> {
    try {
      await this.uploadToTikTok(
        options.videoPath,
        options.title || options.caption || '',
      );
      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  public async uploadToTikTok(videoPath: string, title: string) {
    const absolutePath = path.resolve(videoPath);

    try {
      const initRes = await this.tiktokApi.uploadToDrafts(absolutePath, title);
      console.log('initRes: ', initRes);
    } catch (error) {
      console.error('Error uploadToTikTok:', error);
      throw error;
    }
  }
}
