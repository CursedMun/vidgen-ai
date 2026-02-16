import fs from 'node:fs';
import path from 'node:path';
import wretch from 'wretch';
import QueryStringAddon from 'wretch/addons/queryString';

export class TopMediAiApi {
  private api = wretch('https://api.topmediai.com/v1')
    .addon(QueryStringAddon);
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.api = this.api.headers({
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json'
    });
  }

  public async getSpeakers(): Promise<any> {
    try {
      const res = await this.api
        .url('/voices_list')
        .get()
        .json<any>();

      return res.Voice[0].speaker;
    } catch (error) {
      console.error('Error searching for voices:', error);
      return null;
    }
  }

  public async generateMusic(text: string, speakerId: string = "f334eecc-3825-11ee-a861-00163e2ac61b"): Promise<string | null> {
    try {
      const speaker = await this.getSpeakers()
      const res = await this.api
        .url('/text2speech')
        .post({
          text: text,
          speaker: speaker || speakerId,
          emotion: 'Excited',
          refresh: 0
        })
        .json<any>();

      if (res.status === 200 && res.data && res.data.oss_url) {
        return res.data.oss_url;
      }
      console.error('Error in TTS response:', res.message);
      return null;
    } catch (error) {
      console.error('Error generating TTS:', (error as Error).message);
      return null;
    }
  }

  public async checkStatus(taskId: string): Promise<string | null> {
    try {
      const res = await this.api
        .url('/music_status')
        .query({ task_id: taskId })
        .get()
        .json<any>();

      if (res.data?.audio_url) {
        return res.data.audio_url;
      }

      return null;
    } catch (error) {
      console.error('Error checking audio status:', (error as Error).message);

      return null;
    }
  }

  public async saveAudioLocally(
    url: string,
    fileName: string,
  ): Promise<string> {
    const dirPath = path.resolve('static/audios/tts');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    const outputPath = path.join(dirPath, `${fileName}.mp3`);
    const arrayBuffer = await wretch(url).get().arrayBuffer();

    fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));
    return `/audios/tts/${fileName}.mp3`;
  }
}
