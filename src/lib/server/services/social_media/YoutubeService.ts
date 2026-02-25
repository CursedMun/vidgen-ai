import type { Account } from '@prisma/client';
import type { Auth } from 'googleapis';
import { google } from 'googleapis';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { type Innertube, Utils } from 'youtubei.js';
import type { TDatabase } from '../../infrastructure/db/client';
import type { YoutubeApi } from '../../infrastructure/YoutubeAPI';
import {
  BaseSocialMedia,
  type UploadOptions,
  type UploadResult,
} from './BaseSocialMedia';

export class YoutubeService extends BaseSocialMedia {
  constructor(
    private db: TDatabase,
    private yt: Innertube,
    private ytOauth2Client: Auth.OAuth2Client,
    private youtubeApi: YoutubeApi,
  ) {
    super();
  }

  public getPlatform(): string {
    return 'youtube';
  }

  public async upload(options: UploadOptions): Promise<UploadResult> {
    try {
      const account = await this.db.account.findFirst({
        where: {
          id: options.accountId,
        },
      });
      if (!account) throw new Error(`Account not found ${options.accountId}.`);
      const result = await this.uploadShort(
        options.videoPath,
        options.title || '',
        options.description || '',
        account,
      );
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  public async getAuthUrl() {
    return this.ytOauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly',
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      prompt: 'consent',
    });
  }

  public async saveYotubeAccount(code: string) {
    try {
      const { tokens } = await this.ytOauth2Client.getToken(code);

      this.ytOauth2Client.setCredentials(tokens);
      const youtube = google.youtube({
        version: 'v3',
        auth: this.ytOauth2Client,
      });
      const channelRes = await youtube.channels.list({
        part: ['snippet'],
        mine: true,
      });
      const channelName =
        channelRes.data.items?.[0]?.snippet?.title ?? 'Canal YouTube';

      return await this.db.account.create({
        data: {
          name: channelName,
          email: '',
          platform: 'youtube',
          jsonData: JSON.stringify({
            channelId: channelRes.data.items?.[0]?.id || null,
            accessToken: tokens.access_token || null,
            refreshToken: tokens.refresh_token!,
            expiryDate: tokens.expiry_date || null,
            clientId: null,
          }),
        },
      });
    } catch (error) {
      console.error('Detalhe do Erro no getToken:', error);
      throw error;
    }
  }
  public async getYoutubeAccountByLink(url: string) {
    try {
      // Extract channel identifier from URL
      let channelId = '';

      // Handle different URL formats
      // youtube.com/@username or youtube.com/c/channelname or youtube.com/channel/CHANNEL_ID
      const handleMatch = url.match(/youtube\.com\/@([^/?]+)/);
      const channelMatch = url.match(/youtube\.com\/channel\/([^/?]+)/);
      const customMatch = url.match(/youtube\.com\/c\/([^/?]+)/);
      const usernameMatch = url.match(/youtube\.com\/user\/([^/?]+)/);

      if (channelMatch) {
        channelId = channelMatch[1];
      } else if (handleMatch || customMatch || usernameMatch) {
        const identifier =
          handleMatch?.[1] || customMatch?.[1] || usernameMatch?.[1];
        channelId =
          (await this.youtubeApi.findChannelIdByName(identifier || '')) ?? '';
      } else {
        throw new Error('Invalid YouTube channel URL format');
      }

      if (!channelId) {
        throw new Error('Could not find channel ID');
      }

      // Fetch channel details using YouTube Data API
      const youtube = google.youtube({
        version: 'v3',
        auth: this.ytOauth2Client,
      });

      const channelRes = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        id: [channelId],
      });

      if (!channelRes.data.items || channelRes.data.items.length === 0) {
        throw new Error('Channel not found');
      }

      const channel = channelRes.data.items[0];

      return {
        channelId: channel.id,
        channelName: channel.snippet?.title ?? 'Unknown Channel',
        description: channel.snippet?.description ?? '',
        thumbnailUrl: channel.snippet?.thumbnails?.default?.url ?? '',
        subscriberCount: channel.statistics?.subscriberCount ?? '0',
        videoCount: channel.statistics?.videoCount ?? '0',
      };
    } catch (error: any) {
      console.error('Error fetching YouTube channel by link:', error);
      throw new Error(`Failed to get YouTube account: ${error.message}`);
    }
  }

  public async fetchChannelLatestVideo(
    channel: Awaited<ReturnType<typeof this.getYoutubeAccountByLink>>,
  ) {
    try {
      console.log(`Fetching latest video for channel: ${channel.channelName}`);
      const channelId = channel.channelId;
      const videoId = await this.youtubeApi.findLatestShortId(channelId!);
      if (!videoId) {
        console.log(`No videos found for channel: ${channel.channelName}`);
        return;
      }

      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      // Check if this video is already in transcriptions
      const existingTranscription = await this.db.transcription.findFirst({
        where: { videoId: videoId },
      });

      if (existingTranscription) {
        console.log(`Video ${videoId} already scheduled or processed`);
        return;
      }

      // Create a new pending transcription
      await this.db.transcription.create({
        data: {
          videoUrl: videoUrl,
          videoId: videoId,
          thumbnailUrl: thumbnailUrl,
          status: 'pending',
          transcript: '', // Will be filled when processing completes
        },
      });
    } catch (error) {
      console.error(
        `Error fetching video for channel ${channel.channelName}:`,
        error,
      );
    }
  }
  public async downloadAudio(videoUrl: string): Promise<string> {
    const downloadsDir = path.join(process.cwd(), 'downloads');

    // Ensure downloads directory exists
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    const extractedVideoId = this.extractVideoId(videoUrl);
    if (!extractedVideoId) {
      throw new Error('Invalid YouTube URL.');
    }
    console.log('Starting download for URL:', videoUrl);
    const info = await this.yt.getShortsVideoInfo(extractedVideoId);
    const videoId = info.basic_info.id;
    if (!videoId) {
      throw new Error('Could not extract video ID.');
    }
    console.log('videoId:', videoId);
    const filePath = path.join(
      downloadsDir,
      `audio_${videoId || Date.now()}.mp4`,
    );

    const stream = await this.yt.download(videoId, {
      type: 'audio',
      codec: 'mp4a',
    });
    const file = fs.createWriteStream(filePath);
    for await (const chunk of Utils.streamToIterable(stream)) {
      file.write(chunk);
    }

    return filePath;
  }
  public async downloadLatestChannelShortVideo(
    channel: Awaited<ReturnType<typeof this.getYoutubeAccountByLink>>,
  ): Promise<string | undefined> {
    try {
      console.log(`Fetching latest video for channel: ${channel.channelName}`);
      const videoId = await this.youtubeApi.findLatestShortId(
        channel.channelId!,
      );
      if (!videoId) {
        console.log(`No videos found for channel: ${channel.channelName}`);
        return undefined;
      }

      const downloadsDir = path.join(process.cwd(), 'static/downloads');
      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
      }

      const fileName = `yt_${videoId}_${Date.now()}.mp4`;
      const filePath = path.join(downloadsDir, fileName);

      const stream = await this.yt.download(videoId, {
        type: 'video',
        quality: '720p',
      });

      const file = fs.createWriteStream(filePath);
      for await (const chunk of Utils.streamToIterable(stream)) {
        file.write(chunk);
      }
      file.end();

      return filePath;
    } catch (error) {
      console.error(
        `Error downloading video for channel ${channel.channelName}:`,
        error,
      );
    }
  }
  public async getChannelLatestShortId(channelName: string) {
    const channelId = await this.youtubeApi.findChannelIdByName(channelName);
    if (!channelId) {
      throw new Error('Channel not found.');
    }

    const videoId = await this.youtubeApi.findLatestShortId(channelId);
    if (!videoId) {
      throw new Error('No shorts found for this channel.');
    }
    return videoId;
  }

  public async getChannelIdByName(channelName: string) {
    const channelId = await this.youtubeApi.findChannelIdByName(channelName);
    if (!channelId) {
      throw new Error('Channel not found.');
    }
    return channelId;
  }

  public async getChannelId(videoUrl: string) {
    const extractedVideoId = this.extractVideoId(videoUrl);
    if (!extractedVideoId) {
      throw new Error('Invalid YouTube URL.');
    }
    const id = await this.youtubeApi.findChannelIdByUrl(extractedVideoId);
    if (!id) {
      throw new Error('Video not found.');
    }
    return id;
  }

  private extractVideoId(url: string): string | null {
    const patterns = [
      /[?&]v=([^&#]+)/,
      /https?:\/\/youtu\.be\/([^?&#]+)/,
      /\/embed\/([^?&#]+)/,
      /\/shorts\/([^?&#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }
    return null;
  }

  public async uploadShort(
    absoluteFilePath: string,
    title: string,
    description: string,
    account: Account,
  ) {
    const { refreshToken } = JSON.parse(account.jsonData);
    if (!account || !refreshToken) {
      throw new Error(
        `Refresh token não encontrado para a conta ID: ${account.id}`,
      );
    }

    this.ytOauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    try {
      const { credentials } = await this.ytOauth2Client.refreshAccessToken();
      this.ytOauth2Client.setCredentials(credentials);
    } catch (refreshError: any) {
      throw new Error(
        `Falha ao renovar token da conta ${account.id}: ${refreshError.message}`,
      );
    }

    const youtube = google.youtube({
      version: 'v3',
      auth: this.ytOauth2Client,
    });
    let videoPath = absoluteFilePath;
    if (!path.isAbsolute(absoluteFilePath)) {
      const root = process.cwd();
      videoPath = path.join(root, 'static', absoluteFilePath);
    }
    try {
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Ficheiro não encontrado: ${videoPath}`);
      }

      const res = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: `${title.slice(0, 90)} #shorts`,
            description: description,
            categoryId: '17', // Sports
            defaultLanguage: 'pt-PT',
          },
          status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: fs.createReadStream(videoPath),
        },
      });

      console.log('upload complete');

      return {
        success: true,
        videoId: res.data.id,
        url: `https://www.youtube.com/shorts/${res.data.id}`,
      };
    } catch (error: any) {
      const errorDetail = error.response?.data?.error || error.message;
      console.error('YouTube API error:', JSON.stringify(errorDetail, null, 2));

      throw new Error(`YouTube upload failed: ${error.message}`);
    }
  }
}
