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
      const initRes = await this.instagramApi.uploadReel(videoPath, title);
      console.log('initRes: ', initRes);
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
      console.log('post ID:', resId);
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
