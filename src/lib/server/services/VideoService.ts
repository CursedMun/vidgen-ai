import type {
  GenerateVideosOperation,
  GoogleGenAI,
  VideoGenerationReferenceImage,
} from '@google/genai';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs';
import path from 'node:path';
import { OpenAI } from 'openai';

import type { TopMediAiApi } from '../infrastructure/TopMediAiApi';
export type Asset = {
  mimeType: string;
  imageBytes: string;
};
export class VideoService {
  constructor(
    private googleAI: GoogleGenAI,
    private openAI: OpenAI,
    private musicApi: TopMediAiApi,
  ) {}

  public async generateSocialMediaDescription(
    mediaType: 'video' | 'image',
    promptUsed: string,
  ): Promise<string> {
    const prompt = `
      Generate an engaging social media caption.
      Media type: "${mediaType}"
      Visual prompt used during creation: "${promptUsed}"

      Rules:
      1. Base the caption strictly on the context of the provided visual prompt and script.
      2. Maintain an attractive and engaging tone.
      3. Include relevant emojis.
      4. Add platform-specific hashtags.
      5. Maximum length: 100 words.
    `;

    const chatCompletion = await this.openAI.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });

    return (
      chatCompletion.choices[0]?.message?.content?.trim() ||
      'Description not generated.'
    );
  }

  public async generateVideo(
    prompt: string,
    model: 'veo' | 'chatgpt' = 'chatgpt',
    imagesReference?: Asset[],
  ): Promise<string> {
    try {
      let videoPath = [];
      if (!model || model === 'chatgpt') {
        const video = await this.generateSoraVideo(prompt, '');
        videoPath = [video];
      } else {
        videoPath = await this.generateVeoVideo(prompt, imagesReference);
      }

      return videoPath[0];
    } catch (error) {
      console.error('Error generating video:', (error as Error).message);
      throw error;
    }
  }

  private async generateSpeechScriptFromTranscript(
    audioPrompt: string,
    transcription: string,
    segments: number,
  ): Promise<string> {
    // 8 segunds
    const totalDurationSeconds = segments * 8;
    const calculatedWords = totalDurationSeconds * 2.5;
    const minWords = 25;
    const maxWords = Math.max(minWords, calculatedWords);
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

    const response = await this.openAI.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });

    return (
      response.choices[0].message.content
        ?.replace(/["']/g, '')
        .replace(/\n/g, ' ')
        .trim() || ''
    );
  }
  public async describeVideo(inputPath: string) {
    const videoBuffer = fs.readFileSync(inputPath);
    const base64Video = videoBuffer.toString('base64');
    const response = await this.googleAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Analyze this video and provide a detailed description covering:
1. Main subject/focus of the video
2. Actions and movements occurring
3. Visual style and cinematography
4. Setting and environment
5. Mood and tone
6. Key visual elements
7. Audio/sound if present

Be specific and descriptive.`,
            },
            {
              inlineData: {
                mimeType: 'video/mp4',
                data: base64Video,
              },
            },
          ],
        },
      ],
    });

    return response.text;
  }

  private async generateVeoVideo(
    prompt: string,
    referenceImages?: Asset[],
    referenceVideos?: Asset[],
  ): Promise<string[]> {
    let operation: GenerateVideosOperation;

    const refImages = referenceImages?.map((x) => {
      // Ensure imageBytes is base64 encoded
      const base64Image = x.imageBytes.includes('base64,')
        ? x.imageBytes.split('base64,')[1]
        : x.imageBytes;

      return {
        image: {
          imageBytes: base64Image,
          mimeType: x.mimeType,
        },
      } as VideoGenerationReferenceImage;
    });

    operation = await this.googleAI.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: prompt,
      config: {
        aspectRatio: '9:16',
        referenceImages: refImages,
      },
    });

    // Polling
    const result = await this.waitForOperation(operation);
    if (result.response?.generatedVideos?.[0]) {
      const videoData = result.response.generatedVideos[0];
      let videoPath = `veo_${Date.now()}.mp4`;
      videoPath = path.resolve('static', videoPath.replace(/^\//, ''));
      if (videoData.video) {
        await this.googleAI.files.download({
          file: videoData.video,
          downloadPath: videoPath,
        });
      }

      return [videoPath];
    }

    throw new Error('Failed to generate video with VEO');
  }

  private async generateSoraVideo(
    prompt: string,
    inputVideoPath?: string,
  ): Promise<string> {
    try {
      console.log('Starting Sora video generation with prompt:', prompt);

      const videoConfig: OpenAI.Videos.VideoCreateParams = {
        model: 'sora-2',
        prompt,
        size: '720x1280', // vertical 9:16
        seconds: '8',
      };

      if (inputVideoPath) {
        console.log('Using input video reference:', inputVideoPath);
        const videoBuffer = fs.readFileSync(inputVideoPath);
        const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
        const videoFile = new File([videoBlob], path.basename(inputVideoPath), {
          type: 'video/mp4',
        });
        videoConfig.input_reference = videoFile;
      }

      const videoJob = await this.openAI.videos.create(videoConfig);
      // Polling
      await this.waitForCompletion(videoJob.id);

      // Download
      const response = await this.openAI.videos.downloadContent(videoJob.id);

      const blob = await response.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());

      const fileName = `video_${Date.now()}.mp4`;
      const videoPath = path.resolve('static', fileName);

      fs.writeFileSync(videoPath, buffer);

      const outputDir = path.resolve('./static');
      const filePath = path.join(outputDir, fileName);
      console.log('✅ Video saved at:', filePath);
      return filePath;
    } catch (error) {
      console.error('Error in Sora:', (error as Error).message);
      throw error;
    }
  }

  private async waitForCompletion(videoId: string) {
    while (true) {
      const status = await this.openAI.videos.retrieve(videoId);

      console.log(
        `Status: ${status.status} | Progress: ${status.progress ?? 0}%`,
      );

      if (status.status === 'completed') {
        return status;
      }

      if (status.status === 'failed') {
        throw new Error('Video generation failed');
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  public async mergeAudioAndVideo(
    videoPath: string,
    audioPath: string,
  ): Promise<string> {
    const getFullPath = (p: string) =>
      p.startsWith('/')
        ? p
        : path.resolve('static', p.replace(/^\/?static\//, ''));

    const absoluteAudio = getFullPath(audioPath);
    const absoluteVideos = getFullPath(videoPath);
    const outputFileName = `final_${Date.now()}.mp4`;
    const outputPath = path.resolve('static/final_videos', outputFileName);

    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const command = ffmpeg();
      command.input(absoluteVideos);
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

  private async waitForOperation(
    operation: GenerateVideosOperation | undefined,
  ): Promise<GenerateVideosOperation> {
    if (!operation) throw new Error('Operation name is undefined');

    while (!operation.done) {
      console.log('Awaiting video (10s)...');
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await this.googleAI.operations.getVideosOperation({
        operation: operation,
      });
    }
    console.log(operation);

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
    const relativePath = normalizedPath.substring(
      staticIndex + staticMarker.length - 1,
    );
    return relativePath.split(path.sep).join('/');
  }

  public async extractFramesAsBase64(
    videoPath: string,
    frameCount: number = 3,
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const outputDir = path.join('static', 'downloads', 'frames');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPattern = path.join(outputDir, `frame_%03d.png`);
      const frames: string[] = [];
      const command = ffmpeg();
      command.input(videoPath);

      command
        .on('end', () => {
          try {
            const files = fs
              .readdirSync(outputDir)
              .filter((f) => f.startsWith('frame_'))
              .sort();

            for (let i = 0; i < Math.min(frameCount, files.length); i++) {
              const framePath = path.join(outputDir, files[i]);
              const imageBuffer = fs.readFileSync(framePath);
              const base64 = imageBuffer.toString('base64');
              frames.push(base64);
              fs.unlinkSync(framePath);
            }

            resolve(frames);
          } catch (err) {
            reject(err);
          }
        })
        .on('error', (err) => reject(err))
        .output(outputPattern)
        .outputOptions([
          `-vf select='not(mod(n\\,${Math.floor(100 / frameCount)}))',scale=512:512:force_original_aspect_ratio=decrease`,
          '-vsync vfr',
          '-frames:v ' + frameCount,
        ])
        .run();
    });
  }
}
