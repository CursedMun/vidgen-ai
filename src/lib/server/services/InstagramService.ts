import { eq } from 'drizzle-orm';
import { schema, type TDatabase } from '../infrastructure/db/client';
import type { InstagramApi } from '../infrastructure/InstagramApi';
export class InstagramService {
  constructor(
    private db: TDatabase,
    private instagramApi: InstagramApi,
  ) {}

  public async uploadToInstagram(videoPath: string, title: string) {
    try {
      const token = await this.getValidToken();
      this.instagramApi.setAccessToken(token);
      const initRes = await this.instagramApi.uploadReel(videoPath, title);
      console.log('initRes: ', initRes);
    } catch (error) {
      console.error('Error uploadToInstagram:', error);
      throw error;
    }
  }

  public async postImageToInstagram(imageUrl: string, title: string) {
    try {
      const token = await this.getValidToken();
      this.instagramApi.setAccessToken(token);
      const resId = await this.instagramApi.uploadImage(imageUrl, title);
      console.log('post ID:', resId);
      return resId
    } catch (error) {
      console.error('Error InstagramService:', error);
      throw error;
    }
  }

  public async refreshToken() {
    try {
      const token = await this.instagramApi.refreshLongLivedToken();
      return token;
    } catch (error) {
      console.error('Error RefreshToken:', error);
      throw error;
    }
  }

  public async getValidToken(): Promise<string> {
    const records = await this.db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'instagram_access_token'))
      .limit(1);

    if (!records || records.length === 0) {
      const firstToken = await this.instagramApi.exchangeForLongLivedToken();
      if (firstToken) {
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + firstToken.expires_in);
        await this.db.insert(schema.settings).values({
          key: "instagram_access_token",
          value: firstToken.access_token,
          expiresAt: expiryDate,
          updatedAt: new Date(),
        });

        console.log('Token successfully added for another 60 days.');
        return firstToken.access_token;
      }
      throw new Error(
        'Instagram is not configured. Please complete the initial setup of the Short-Lived Token in the dashboard.',
      );
    }

    const record = records[0];
    const now = new Date();
    const expiresAt = record.expiresAt
      ? new Date(record.expiresAt)
      : new Date(0);

    // 2. Definimos a margem de segurança (10 dias antes de expirar)
    const tenDaysInMs = 10 * 24 * 60 * 60 * 1000;
    const isCloseToExpire = expiresAt.getTime() - now.getTime() < tenDaysInMs;

    // 3. Verifica se o token já expirou completamente
    if (expiresAt.getTime() <= now.getTime()) {
      throw new Error(
        'Your Instagram token has completely expired. You are required to log in manually again.',
      );
    }

    if (isCloseToExpire) {
      try {
        // /refresh_access_token
        const refreshedData = await this.instagramApi.refreshLongLivedToken();

        const newAccessToken = refreshedData.access_token;
        // expires_in: 5184000 seconds
        const newExpiry = new Date();
        newExpiry.setSeconds(
          newExpiry.getSeconds() + (refreshedData.expires_in || 5184000),
        );

        await this.db
          .update(schema.settings)
          .set({
            value: newAccessToken,
            expiresAt: newExpiry,
            updatedAt: new Date(),
          })
          .where(eq(schema.settings.key, 'instagram_access_token'));

        console.log('Token successfully renewed for another 60 days.');
        return newAccessToken;
      } catch (error: any) {
        console.error(
          'Failed to renew token automatically.',
          error.message,
        );
        return record.value;
      }
    }

    console.log('The current token is still valid. Proceeding...');
    return record.value;
  }
}
