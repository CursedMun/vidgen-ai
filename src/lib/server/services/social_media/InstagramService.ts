import { SUPABASE_KEY } from '$env/static/private';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import path from 'path';
import type { TDatabase } from '../../infrastructure/db/client';
import type { InstagramApi } from '../../infrastructure/InstagramApi';
import {
  BaseSocialMedia,
  type UploadOptions,
  type UploadResult,
} from './BaseSocialMedia';

const supabaseUrl = 'https://knepxsusnvopbojcrjpn.supabase.co';
const supabase = createClient(supabaseUrl, SUPABASE_KEY);
export class InstagramService extends BaseSocialMedia {
  constructor(
    private db: TDatabase,
    private instagramApi: InstagramApi,
  ) {
    super();
  }

  public getPlatform(): string {
    return 'instagram';
  }

  public async upload(options: UploadOptions): Promise<UploadResult> {
    try {
      const postId = await this.uploadToInstagram(
        options.videoPath,
        options.title || options.caption || '',
        options.metadata?.type || 'Video',
      );
      return {
        success: true,
        postId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  public async getInsights(id: number) {
    const account = await this.db.account.findFirst({
      where: {
        id: id,
      },
    });
    if (!account) throw new Error(`Account ID ${id} not found.`);

    if (account.platform !== "instagram") return []
    const data = JSON.parse(account.jsonData);

    return (await this.instagramApi.getAccountInsights(data.instagramBusinessId, data.accessToken)).data
  }

  public async getMedias(id: number) {
    const account = await this.db.account.findFirst({
      where: {
        id: id,
      },
    });
    if (!account) throw new Error(`Account ID ${id} not found.`);

    if (account.platform !== "instagram") return []
    const data = JSON.parse(account.jsonData);

    const allMedias = (await this.instagramApi.getMediasByAccount(data.instagramBusinessId, data.accessToken)).data

    const mediaData = await Promise.all(
      allMedias.map(async (media: any) => {
        try {
          const insight = await this.instagramApi.getMediaInsights(media.id, data.accessToken);
          return {
            ...media,
            insight: insight.data
          };
        } catch (error) {
          console.error(`Erro ao buscar insights da média ${media.id}:`, error);
          return { ...media, insight: null };
        }
      })
    );
    return mediaData
  }

  public async uploadToSupabase(filePath: string, fileName: string) {
    const fileBuffer = readFileSync(filePath);
    const extension = path.extname(filePath).toLowerCase(); // .jpg, .png, .mp4, etc.

    let contentType = 'application/octet-stream';
    if (extension === '.mp4') contentType = 'video/mp4';
    if (extension === '.png') contentType = 'image/png';
    if (extension === '.jpg' || extension === '.jpeg')
      contentType = 'image/jpeg';

    const { data, error } = await supabase.storage
      .from('videos')
      .upload(`${fileName}`, fileBuffer, {
        contentType: contentType,
        upsert: true,
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('videos')
      .getPublicUrl(`${fileName}`);

    return publicUrlData.publicUrl;
  }

  public async uploadToInstagram(
    urlPath: string,
    title: string,
    type: 'video' | 'image',
  ) {
    try {
      let relativePath = '';
      if (urlPath.includes('/static')) {
        relativePath = urlPath.split('/static')[1];
      } else {
        relativePath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
      }
      const filename = path.basename(urlPath);
      const localFileSystemPath = `./static${relativePath}`;
      const publicUrl = await this.uploadToSupabase(
        localFileSystemPath,
        filename || (type === 'video' ? 'video.mp4' : 'image.png'),
      );
      if (type === 'video') {
        return await this.instagramApi.uploadReel(publicUrl, title);
      }
      return await this.postImageToInstagram(publicUrl, title);
    } catch (error) {
      console.error('Error uploadToInstagram:', error);
      throw error;
    }
  }

  public async setCurrentUser(accountId: number) {
    try {
      const token = await this.getValidTokenByAccount(accountId);
      const account = await this.db.account.findUnique({
        where: {
          id: accountId,
        },
      });

      if (!account) throw new Error(`Account not found ${accountId}.`);
      const data = JSON.parse(account.jsonData as string);
      this.instagramApi.setAccountData(token, data.instagramBusinessId);
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  public async postImageToInstagram(imageUrl: string, title: string) {
    try {
      const resId = await this.instagramApi.uploadImage(imageUrl, title);
      return resId;
    } catch (error) {
      console.error('Error InstagramService:', error);
      throw error;
    }
  }

  public async getValidTokenByAccount(accountId: number): Promise<string> {
    const record = await this.db.account.findFirst({
      where: {
        id: accountId,
        platform: 'instagram',
      },
    });

    if (!record) {
      throw new Error(`Account ID ${accountId} not found.`);
    }

    const data = JSON.parse(record.jsonData);
    const now = new Date();
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : new Date(0);

    // 10 days (days / hours / minutes / seconds / milliseconds)
    const tenDaysInMs = 10 * 24 * 60 * 60 * 1000;
    const isCloseToExpire = expiresAt.getTime() - now.getTime() < tenDaysInMs;

    if (expiresAt.getTime() <= now.getTime()) {
      throw new Error(
        `O token da conta "${record.name}" expirou totalmente. É necessário reautenticar.`,
      );
    }

    if (isCloseToExpire) {
      try {
        const refreshedData = await this.instagramApi.refreshLongLivedToken(
          data.accessToken,
        );

        const newExpiry = new Date();
        newExpiry.setSeconds(
          newExpiry.getSeconds() + (refreshedData.expires_in || 5184000),
        );

        data.accessToken = refreshedData.access_token;
        data.expiresAt = newExpiry.toISOString();

        await this.db.account.update({
          where: { id: accountId },
          data: {
            jsonData: JSON.stringify(data),
          },
        });

        return refreshedData.access_token;
      } catch (error: any) {
        console.error('Automatic refresh failed:', error.message);
        return data.accessToken;
      }
    }

    return data.accessToken;
  }

  public async getValidTokenForAccount(
    accountId: number,
  ): Promise<{ token: string; businessId: string }> {
    const account = await this.db.account.findUnique({
      where: { id: accountId },
    });

    if (!account) throw new Error('Conta não encontrada');

    const token = await this.getValidTokenByAccount(account.id);
    const data = JSON.parse(account.jsonData);

    return {
      token,
      businessId: data.instagramBusinessId,
    };
  }

  public async discoverAndSaveAccount(shortToken: string, aliasName: string) {
    try {
      const account =
        await this.instagramApi.discoverBusinessAccount(shortToken);
      const longToken =
        await this.instagramApi.exchangeForLongLivedToken(shortToken);

      const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

      return await this.db.account.create({
        data: {
          name: aliasName,
          platform: 'instagram',
          jsonData: JSON.stringify({
            instagramBusinessId: account.id,
            accessToken: longToken.access_token,
            expiresAt: expiresAt.toISOString(),
          }),
        },
      });
    } catch (error: any) {
      console.error('Error adding new account:', error.message);
    }
  }
}
