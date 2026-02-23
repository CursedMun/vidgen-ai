import { SUPABASE_KEY } from '$env/static/private';
import { createClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import path from 'path';
import { schema, type TDatabase } from '../infrastructure/db/client';
import type { InstagramApi } from '../infrastructure/InstagramApi';

const supabaseUrl = 'https://knepxsusnvopbojcrjpn.supabase.co';
const supabase = createClient(supabaseUrl, SUPABASE_KEY);
export class InstagramService {
  constructor(
    private db: TDatabase,
    private instagramApi: InstagramApi,
  ) {}

  public async uploadToSupabase(filePath: string, fileName: string) {
    const fileBuffer = readFileSync(filePath);
    const extension = path.extname(filePath).toLowerCase(); // .jpg, .png, .mp4, etc.

    let contentType = 'application/octet-stream';
    if (extension === '.mp4') contentType = 'video/mp4';
    if (extension === '.png') contentType = 'image/png';
    if (extension === '.jpg' || extension === '.jpeg') contentType = 'image/jpeg';

    const { data, error } = await supabase.storage
      .from('videos')
      .upload(`${fileName}`, fileBuffer, {
        contentType: contentType,
        upsert: true
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('videos')
      .getPublicUrl(`${fileName}`);

    return publicUrlData.publicUrl;
  }

  public async uploadToInstagram(urlPath: string, title: string, type: string | null) {
    try {
      let relativePath = '';
      if (urlPath.includes('/static')) {
        relativePath = urlPath.split('/static')[1];
      } else {
        relativePath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
      }
      const filename = path.basename(urlPath);
      const localFileSystemPath = `./static${relativePath}`;
      const publicUrl = await this.uploadToSupabase(localFileSystemPath, filename || (type === "Video" ? "video.mp4" : "image.png"));
      if (type === "Video") {
        return await this.instagramApi.uploadReel(publicUrl, title);
      }
      return await this.postImageToInstagram(publicUrl, title)
    } catch (error) {
      console.error('Error uploadToInstagram:', error);
      throw error;
    }
  }

  public async setCurrentUser(accountId: number) {
    try {
      const token = await this.getValidTokenByAccount(accountId);
      const account = await this.db
        .select()
        .from(schema.instagramAccounts)
        .where(eq(schema.instagramAccounts.id, accountId))
        .get();

      if (!account)  throw new Error(`Account not found ${accountId}.`);
      this.instagramApi.setAccountData(token, account.instagramBusinessId);
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  public async postImageToInstagram(imageUrl: string, title: string) {
    try {
      const resId = await this.instagramApi.uploadImage(imageUrl, title);
      return resId
    } catch (error) {
      console.error('Error InstagramService:', error);
      throw error;
    }
  }

  public async getValidTokenByAccount(accountId: number): Promise<string> {
    const records = await this.db
      .select()
      .from(schema.instagramAccounts)
      .where(eq(schema.instagramAccounts.id, accountId))
      .limit(1);

    if (!records || records.length === 0) {
      throw new Error(`Account ID ${accountId} not found.`);
    }

    const record = records[0];
    const now = new Date();
    const expiresAt = record.expiresAt ? new Date(record.expiresAt) : new Date(0);

    // 10 days (days / hours / minutes / seconds / milliseconds)
    const tenDaysInMs = 10 * 24 * 60 * 60 * 1000;
    const isCloseToExpire = (expiresAt.getTime() - now.getTime()) < tenDaysInMs;

    if (expiresAt.getTime() <= now.getTime()) {
      throw new Error(
        `O token da conta "${record.name}" expirou totalmente. É necessário reautenticar.`
      );
    }

    if (isCloseToExpire) {
      try {
        const refreshedData = await this.instagramApi.refreshLongLivedToken(record.accessToken);

        const newExpiry = new Date();
        newExpiry.setSeconds(newExpiry.getSeconds() + (refreshedData.expires_in || 5184000));

        await this.db
          .update(schema.instagramAccounts)
          .set({
            accessToken: refreshedData.access_token,
            expiresAt: newExpiry,
            updatedAt: new Date()
          })
          .where(eq(schema.instagramAccounts.id, accountId));

        return refreshedData.access_token;
      } catch (error: any) {
        console.error('Automatic refresh failed:', error.message);
        return record.accessToken;
      }
    }

    return record.accessToken;
  }

  public async getValidTokenForAccount(accountId: number): Promise<{ token: string, businessId: string }> {
    const account = await this.db
      .select()
      .from(schema.instagramAccounts)
      .where(eq(schema.instagramAccounts.id, accountId))
      .get();

    if (!account) throw new Error("Conta não encontrada");

    this.getValidTokenByAccount(account.id)

    return {
      token: account.accessToken,
      businessId: account.instagramBusinessId
    };
  }

  public async discoverAndSaveAccount(shortToken: string, aliasName: string) {
    try {
      const account = await this.instagramApi.discoverBusinessAccount(shortToken)
      const longToken = await this.instagramApi.exchangeForLongLivedToken(shortToken)
      return await this.db.insert(schema.instagramAccounts).values({
        name: aliasName,
        instagramBusinessId: account.id,
        accessToken: longToken.access_token,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      }).returning();
    } catch (error: any) {
      console.error('Error adding new account:', error.message);
    }

  }
}
