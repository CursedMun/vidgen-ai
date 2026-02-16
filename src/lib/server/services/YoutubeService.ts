import { eq } from 'drizzle-orm';
import type { Auth } from 'googleapis';
import { google } from 'googleapis';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { type Innertube, Utils } from 'youtubei.js';
import type { TDatabase } from '../infrastructure/db/client';
import { channels, transcriptions } from '../infrastructure/db/schema';
import type { YoutubeApi } from '../infrastructure/YoutubeAPI';
export class YoutubeService {
  constructor(
    private db: TDatabase,
    private yt: Innertube,
    private ytOauth2Client: Auth.OAuth2Client,
    private youtubeApi: YoutubeApi,
  ) {}

  public async fetchChannelLatestVideo(channel: typeof channels.$inferSelect) {
    try {
      console.log(`Fetching latest video for channel: ${channel.channel_name}`);

      const videoId = await this.youtubeApi.findLatestShortId(
        channel.channel_id,
      );
      if (!videoId) {
        console.log(`No videos found for channel: ${channel.channel_name}`);
        return;
      }

      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      // Check if this video is already in transcriptions
      const existingTranscription =
        await this.db.query.transcriptions.findFirst({
          where: (t, { eq }) => eq(t.video_id, videoId),
        });

      if (existingTranscription) {
        console.log(`Video ${videoId} already scheduled or processed`);
        return;
      }

      // Create a new pending transcription
      await this.db.insert(transcriptions).values({
        channel_id: channel.id,
        video_url: videoUrl,
        video_id: videoId,
        thumbnail_url: thumbnailUrl,
        status: 'pending',
        transcript: '', // Will be filled when processing completes
      });

      // Update last fetched time
      await this.db
        .update(channels)
        .set({ last_fetched_at: new Date() })
        .where(eq(channels.id, channel.id));
    } catch (error) {
      console.error(
        `Error fetching video for channel ${channel.channel_name}:`,
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
    console.log('Extracted video ID:', videoId);
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
    const id = await this.youtubeApi.findChannelIdByUrl(extractedVideoId)
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
    description: string
  ) {
    const youtube = google.youtube({
      version: 'v3',
      auth: this.ytOauth2Client,
    });

    const root = process.cwd();
    const videoPath = path.join(root, 'static', absoluteFilePath);
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
