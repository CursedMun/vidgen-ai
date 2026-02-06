import type { GoogleGenAI } from '@google/genai';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs';
import path from 'node:path';
import type { TDatabase } from '../infrastructure/db/client';
import type { TopMediAiApi } from '../infrastructure/TopMediAiApi';
import type { InstagramService } from './InstagramService';
import type { TwitterService } from './TwitterService';

export class VideoService {
  constructor(
    private db: TDatabase,
    private ai: GoogleGenAI,
    private musicApi: TopMediAiApi,
    private twitterService: TwitterService,
    private instagramService: InstagramService
  ) {}


  public async generatePhoto(transcription: string): Promise<string> {
    try {
      const prompt = await this.generateVideoPrompt(transcription);
      // const prompt = "Main Message: A high-performance professional footballer is recognized as an essential, top-tier talent and the best lateral player in the Portuguese league. Emotion: Dominance. Pacing: Medium."
      console.log('generatePhoto prompt: ', prompt);
      const imagePaths = await this.generateImage(prompt);
      return imagePaths;
    } catch (error) {
      console.error('ERROR PHOTO GEMINI/VEO:', (error as Error).message);
      throw error;
    }
  }

  public async generateVideo(transcription: string): Promise<string> {
    try {
      const targetSegments = 1;

      const prompt = await this.generateVideoPrompt(transcription);
      const musicPrompt = await this.generateSpeechScriptFromTranscript(
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

      const videoPaths = await this.generateLongVideo(prompt, targetSegments);
      const finalVideoPath = await this.mergeAudioAndVideo(
        videoPaths,
        audioPath,
      );
      console.log('finalVideoPath: ', finalVideoPath);

      return finalVideoPath;
    } catch (error) {
      console.error('ERROR GEMINI/VEO:', (error as Error).message);
      throw error;
    }
  }

  private async generateVideoPrompt(transcription: string) {
    const prompt = `
    You are a video prompt generator for vertical short-form videos.

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

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    return response.text || '';
  }

  private async generateSpeechScriptFromTranscript(
    transcription: string,
    segments: number,
  ): Promise<string> {
    // 8 segunds
    const totalDurationSeconds = segments * 8;
    const maxWords = totalDurationSeconds * 2.5;

    const prompt = `
    You are an expert sports scriptwriter for short-form videos (TikTok/Reels).
    Your goal is to transform a transcription into a natural, engaging narration for the "Sportiz" quiz.

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

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    return (
      response?.text?.replace(/["']/g, '').replace(/\n/g, ' ').trim() || ''
    );
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
    const imageResponse = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const candidate = imageResponse.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((p) => p.inlineData);

    if (!imagePart || !imagePart.inlineData) {
      throw new Error('Failed to generate reference image.');
    }
    const imageBytes = imagePart.inlineData.data;
    if (!imageBytes) throw new Error('Failed to generate initial image.');
    return imageBytes;
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

  public async publishVideo(videoUrl: string, caption: string, platform: 'instagram' | 'x' | 'tiktok', type: "image" | "video", accoundId?: number | null) {
    console.log('videoUrl: ', videoUrl);
    try {

      if (platform === "instagram") {
        const response = await this.instagramPublish(videoUrl, caption, type, accoundId as number)
        return response;
      }
      if (platform === "x") {
        const response = await this.twitterPublish(videoUrl, caption, type)
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

  private async instagramPublish(url: string, caption: string, type: "image" | "video", accoundId: number) {
    await this.instagramService.setCurrentUser(accoundId)
    if (type === "image") {
      const result = await this.instagramService.postImageToInstagram(
        url,
        caption
      )
      return result
    }
    const result = await this.instagramService.uploadToInstagram(url, caption)
    return result
  }

  private async twitterPublish(url: string, caption: string, type: "image" | "video") {
    const result = await this.twitterService.postPhoto(url, caption)
    return result
  }
}
