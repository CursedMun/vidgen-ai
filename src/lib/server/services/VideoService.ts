import type { GoogleGenAI } from '@google/genai';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs';
import path from 'node:path';
import { OpenAI } from 'openai';

import type { TopMediAiApi } from '../infrastructure/TopMediAiApi';
import type { InstagramService } from './InstagramService';
import type { TwitterService } from './TwitterService';
import type { YoutubeService } from './YoutubeService';

export class VideoService {
  constructor(
    private ai: GoogleGenAI,
    private openai: OpenAI,
    private musicApi: TopMediAiApi,
    private twitterService: TwitterService,
    private instagramService: InstagramService,
    private youtubeService: YoutubeService
  ) {}


  public async generatePhoto(imagePrompt: string, transcription: string): Promise<string> {
    try {
      const prompt = await this.generateVideoPrompt(imagePrompt, transcription);
      // const prompt = "Main Message: A high-performance professional footballer is recognized as an essential, top-tier talent and the best lateral player in the Portuguese league. Emotion: Dominance. Pacing: Medium."
      console.log('generatePhoto prompt: ', prompt);
      const imagePaths = await this.generateImage(prompt);
      return imagePaths;
    } catch (error) {
      console.error('ERROR PHOTO GEMINI/VEO:', (error as Error).message);
      throw error;
    }
  }

  public async generateVideo(videoPrompt: string, audioPrompt: string ,transcription: string): Promise<string> {
    try {
      const targetSegments = 1;

      const prompt = await this.generateVideoPrompt(videoPrompt, transcription);
      const musicPrompt = await this.generateSpeechScriptFromTranscript(
        audioPrompt,
        transcription,
        targetSegments,
      );

      let audioPath = '';
      const audioUrl = await this.musicApi.generateMusic(musicPrompt);
      console.log('audioUrl: ', audioUrl);
      if (audioUrl) {
        const fileName = `sportiz-${Date.now()}`;
        audioPath = await this.musicApi.saveAudioLocally(audioUrl, fileName);
        audioPath = path.resolve('static', audioPath.replace(/^\//, ''));
      }

      const videoPath = await this.generateSoraVideo(prompt)
      console.log('videoPath: ========Z', videoPath);

      const finalVideoPath = await this.mergeAudioAndVideo(
        [videoPath],
        audioPath,
      );
      console.log('finalVideoPath: ', finalVideoPath);

      return finalVideoPath;
    } catch (error) {
      console.error('ERROR GEMINI/VEO:', (error as Error).message);
      throw error;
    }
  }

  private async generateVideoPrompt(videoPrompt: string, transcription: string) {
    const prompt = `
    ${videoPrompt}

    Instructions:
    - Format: vertical 9:16
    - Duration: 30 seconds
    - Style: cinematic, realistic
    - Output: a single AI video generation prompt

    Steps:
    1. Extract the main message in one sentence.
    2. Identify the emotion (choose one word).
    3. Identify pacing (slow, medium, or fast).
    4. Describe:
      - scene
      - actions
      - editing
      - lighting

    Rules:
    - Do NOT explain.
    - Do NOT repeat the transcription.
    - Use clear, direct language.
    - NO FAMOUS NAMES: If the transcription mentions celebrities, politicians, or public figures, replace them with generic, high-quality descriptions (e.g., "a charismatic tech leader" instead of "Elon Musk", or "a legendary football player" instead of "Cristiano Ronaldo").
    - Ensure the visual description is rich enough to guide the AI without using real-world identities.

    Transcription:
    """
    ${transcription}
    """
    `;

    // const response = await this.ai.models.generateContent({
    //   model: 'gemini-2.0-flash',
    //   contents: [{ role: 'user', parts: [{ text: prompt }] }],
    // });
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });

    return response.choices[0].message.content || '';
  }

  private async generateSpeechScriptFromTranscript(
    audioPrompt: string,
    transcription: string,
    segments: number,
  ): Promise<string> {
    // 8 segunds
    const totalDurationSeconds = segments * 8;
    const maxWords = totalDurationSeconds * 2.5;

    const prompt = `
    ${audioPrompt}

    Instructions:
    - Format: Natural spoken language (script).
    - Tone: Energetic, charismatic, and fast-paced sports narrator.
    - Language: English (Universal/American style).
    - TARGET DURATION: Exactly ${totalDurationSeconds} seconds of speech.
    - WORD LIMIT: Approximately ${Math.floor(maxWords)} words.

    Steps:
    1. Summarize the core message into a hook, a body, and a call to action.
    2. Use short, punchy sentences.
    3. Ensure the flow sounds like a real person talking during a live broadcast.

    Rules:
    - Output MUST be only the text to be spoken.
    - NO FAMOUS NAMES: Replace names like "Neymar" or "Messi" with "a legendary superstar" or "the goat".
    - Do NOT use stage directions or emojis.
    - Use natural sports terminology (e.g., "game-changer", "unbelievable").
    - IMPORTANT: The text must be readable in exactly ${totalDurationSeconds} seconds.

    Transcription:
    """
    ${transcription}
    """
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });

    return response.choices[0].message.content?.replace(/["']/g, '').replace(/\n/g, ' ').trim() || '';
  }

  private async generateImage(prompt: string): Promise<string> {
    const imageBytes = await this.generateInitialImage(prompt);
    const outputDir = path.resolve('./static/images');
    const fileName = `image_${Date.now()}.png`;
    const filePath = path.join(outputDir, fileName);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const buffer = Buffer.from(imageBytes, 'base64');
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  private async generateLongVideo(
    prompt: string,
    segments: number,
  ): Promise<string[]> {
    const generatedFiles: string[] = [];
    let lastVideoReference: any = null;

    for (let i = 0; i < segments; i++) {
      let operation: any;

      if (i === 0) {
        const imageBytes = await this.generateInitialImage(prompt);
        operation = await this.ai.models.generateVideos({
          model: 'veo-3.1-generate-preview',
          prompt: prompt,
          config: { aspectRatio: '9:16' },
          image: { imageBytes, mimeType: 'image/png' },
        });
      } else {
        operation = await this.ai.models.generateVideos({
          model: 'veo-3.1-generate-preview',
          prompt: `Continue the previous scene: ${prompt}`,
          config: { aspectRatio: '9:16' },
          video: {
            videoFile: lastVideoReference,
          } as any,
        });
      }

      // Polling
      const result = await this.waitForOperation(operation);
      if (result.response?.generatedVideos?.[0]) {
        const videoData = result.response.generatedVideos[0];
        lastVideoReference = videoData.video;

        let videoPath = `segment_${i}_${Date.now()}.mp4`;
        videoPath = path.resolve('static', videoPath.replace(/^\//, ''));
        await this.ai.files.download({
          file: videoData.video,
          downloadPath: videoPath,
        });

        generatedFiles.push(videoPath);
      }
    }
    return generatedFiles;
  }

  private async generateSoraVideo(prompt: string): Promise<string> {
    try {
      console.log('Iniciando geração Sora com prompt:', prompt);
      const videoJob = await this.openai.videos.create({
        model: "sora-2",
        prompt,
        size: "720x1280", // vertical 9:16
        seconds: "8",
      });

      // Polling
      await this.waitForCompletion(videoJob.id);

      // Download
      const response = await this.openai.videos.downloadContent(videoJob.id);

      const blob = await response.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());

      const fileName = `video_${Date.now()}.mp4`;
      const videoPath = path.resolve("static", fileName);

      fs.writeFileSync(videoPath, buffer);

      const outputDir = path.resolve('./static');
      const filePath = path.join(outputDir, fileName);
      console.log("✅ Vídeo salvo em:", filePath);
      return filePath;
    } catch (error) {
      console.error('Erro no Sora:', (error as Error).message);
      throw error;
    }
  }

  private async waitForCompletion(videoId: string) {
    while (true) {
      const status = await this.openai.videos.retrieve(videoId);

      console.log(
        `Status: ${status.status} | Progress: ${status.progress ?? 0}%`
      );

      if (status.status === "completed") {
        return status;
      }

      if (status.status === "failed") {
        throw new Error("Video generation failed");
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  private async mergeAudioAndVideo(
    videoSegments: string[],
    audioPath: string,
  ): Promise<string> {
    const getFullPath = (p: string) =>
      p.startsWith('/')
        ? p
        : path.resolve('static', p.replace(/^\/?static\//, ''));

    const absoluteAudio = getFullPath(audioPath);
    const absoluteVideos = videoSegments.map((v) => getFullPath(v));
    const outputFileName = `final_${Date.now()}.mp4`;
    const outputPath = path.resolve('static/final_videos', outputFileName);

    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const command = ffmpeg();
      command.input(absoluteVideos[0]);
      command.input(absoluteAudio);

      command
        .videoFilters('scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p')
        .outputOptions([
          '-map 0:v', // Maps video from the first input.
          '-map 1:a', // Maps video from the second input.
          '-c:v libx264', // Codec vídeo
          '-c:a aac', // Codec áudio
          '-shortest',
          '-y',
        ])
        .on('start', (cmd) => console.log('Command:', cmd))
        .on('error', (err) => {
          console.error('Error FFmpeg:', err.message);
          reject(err);
        })
        .on('end', () => {
          console.log('Video generated.');
          resolve(`/final_videos/${outputFileName}`);
        })
        .save(outputPath);
    });
  }

  private async generateInitialImage(prompt: string): Promise<string> {
    const response = await this.openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1792", // Proporção vertical 9:16 aproximada
      response_format: "b64_json",
    });

    const base64Data = response.data?.[0].b64_json;
    if (!base64Data) throw new Error('Failed to generate image with DALL-E');

    return base64Data;
  }

  private async waitForOperation(operation: any | undefined): Promise<any> {
    if (!operation) throw new Error('Operation name is undefined');

    while (!operation.done) {
      console.log('Awaiting video (10s)...');
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await this.ai.operations.getVideosOperation({
        operation: operation,
      });
    }

    if (operation.error) throw new Error(operation.error.message);
    return operation;
  }

  public toRelativePublicPath(absolutePath: string): string {
    const normalizedPath = path.normalize(absolutePath);
    const staticMarker = `${path.sep}static${path.sep}`;
    const staticIndex = normalizedPath.indexOf(staticMarker);

    if (staticIndex === -1) {
      const rootStaticMarker = `${path.sep}static`;
      if (normalizedPath.endsWith(rootStaticMarker)) return '/';
      return normalizedPath;
    }
    const relativePath = normalizedPath.substring(staticIndex + staticMarker.length - 1);
    return relativePath.split(path.sep).join('/');
  }

  public async publishVideo(videoUrl: string, caption: string, platform: 'instagram' | 'x' | 'tiktok'| 'youtube' , type: "image" | "video", accoundId?: number | null) {
    console.log('videoUrl: ', videoUrl);
    try {

      // if (platform === "instagram") {
      //   const response = await this.instagramPublish(videoUrl, caption, type, accoundId as number)
      //   return response;
      // }
      if (platform === "x") {
        const response = await this.twitterPublish(videoUrl, caption, type)
        return response;
      }
      if (platform === "youtube") {
        const response = await this.youtubePublish(videoUrl, caption)
        return response;
      }
    } catch (error) {
      console.error(
        'Publish Video error:',
        (error as Error).message,
      );
      throw new Error('Publish Video error.');
    }
  }

  // private async instagramPublish(url: string, caption: string, type: "image" | "video", accoundId: number) {
  //   await this.instagramService.setCurrentUser(accoundId)
  //   if (type === "image") {
  //     const result = await this.instagramService.postImageToInstagram(
  //       url,
  //       caption
  //     )
  //     return result
  //   }
  //   const result = await this.instagramService.uploadToInstagram(url, caption)
  //   return result
  // }

  private async twitterPublish(url: string, caption: string, type: "image" | "video") {
    const result = await this.twitterService.postPhoto(url, caption)
    return result
  }

  private async youtubePublish(url: string, caption: string) {
    const result = await this.youtubeService.uploadShort(
      url,
      caption,
      ""
    )
    return result
  }
}
