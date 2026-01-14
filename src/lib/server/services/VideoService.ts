import type { GoogleGenAI } from "@google/genai";
import type { TDatabase } from "../infrastructure/db/client";

export class VideoService {
	constructor(
		private db: TDatabase,
		private ai: GoogleGenAI,
	) {}

	// public async generateVideo(transcription: string): Promise<string> {
	// 	try {
	// 		console.log("Starting generate video...");
	// 		const prompt = await this.generateVideoPrompt(transcription);
  //     console.log('prompt: ====>', prompt);
	// 		const video = await this.generate(prompt);
	// 		console.log("Video completed.", video);
	// 		// const channelId = await this.youtubeService.getChannelId(videoUrl);
	// 		// await this.db.insert(schema.transcriptions).values({
	// 		//   video_url: videoUrl,
	// 		//   channel_id: channelId,
	// 		//   transcript: transcription,
	// 		//   createdAt: new Date(),
	// 		// });
	// 		return "";
	// 	} catch (error) {
	// 		console.error(
	// 			"ERROR IN THE GENERATE VIDEO PROCESS (Gemini):",
	// 			(error as Error).message,
	// 		);
	// 		throw new Error("Audio transcription error.");
	// 	} finally {
	// 		// if (localFilePath) {
	// 		//   await this.cleanupFiles(localFilePath).catch((err) =>
	// 		//     console.error('Error:', err),
	// 		//   );
	// 		// }
	// 	}
	// }

	// private async generateVideoPrompt(transcription: string) {
	// 	const prompt = `
  //   You are a video prompt generator for vertical short-form videos.

  //   Instructions:
  //   - Format: vertical 9:16
  //   - Duration: 30 seconds
  //   - Style: cinematic, realistic
  //   - Output: a single AI video generation prompt

  //   Steps:
  //   1. Extract the main message in one sentence.
  //   2. Identify the emotion (choose one word).
  //   3. Identify pacing (slow, medium, or fast).
  //   4. Describe:
  //     - scene
  //     - actions
  //     - editing
  //     - lighting

  //   Rules:
  //   - Do NOT explain.
  //   - Do NOT repeat the transcription.
  //   - Use clear, direct language.

  //   Transcription:
  //   """
  //   ${transcription}
  //   """
  //   `;

	// 	const response = await this.ai.models.generateContent({
	// 		model: "gemini-2.5-flash",
	// 		contents: [
	// 			{
	// 				role: "user",
	// 				parts: [{ text: prompt }],
	// 			},
	// 		],
	// 	});

	// 	return response.text || "";
	// }

	// private async generate(prompt: string): Promise<string> {
	// 	try {
	// 		const imageResponse = await this.ai.models.generateContent({
	// 			model: "gemini-2.5-flash-image",
	// 			contents: [{ role: "user", parts: [{ text: prompt }] }],
	// 		});

	// 		const candidate = imageResponse.candidates?.[0];
	// 		const imagePart = candidate?.content?.parts?.find((p) => p.inlineData);

	// 		if (!imagePart || !imagePart.inlineData) {
	// 			throw new Error("Failed to generate reference image.");
	// 		}
	// 		const imageBytes = imagePart.inlineData.data;
	// 		let operation = await this.ai.models.generateVideos({
	// 			model: "veo-3.1-generate-preview",
	// 			prompt: prompt,
	// 			config: {
	// 				aspectRatio: "9:16",
	// 				negativePrompt: "cartoon, drawing, low quality",
	// 			},
	// 			image: {
	// 				imageBytes: imageBytes,
	// 				mimeType: "image/png",
	// 			},
	// 		});

	// 		while (!operation.done) {
	// 			console.log("Awaiting video (10s)...");
	// 			await new Promise((resolve) => setTimeout(resolve, 10000));
	// 			operation = await this.ai.operations.getVideosOperation({
	// 				operation: operation,
	// 			});
	// 		}

	// 		if (operation.error) {
	// 			throw new Error(`Error generating video: ${operation.error.message}`);
	// 		}

	// 		const videoFile = operation.response?.generatedVideos?.[0]?.video;
	// 		if (videoFile) {
	// 			const downloadPath = `video_${Date.now()}.mp4`;
	// 			await this.ai.files.download({
	// 				file: videoFile,
	// 				downloadPath: downloadPath,
	// 			});
	// 			console.log(`Video saved in: ${downloadPath}`);
	// 			return downloadPath;
	// 		}

	// 		return "";
	// 	} catch (err) {
	// 		console.error("Detailed error in the process:", err);
	// 		throw err;
	// 	}
	// }

  public async generateVideo(transcription: string): Promise<string> {
    try {
      const prompt = await this.generateVideoPrompt(transcription);
      console.log('prompt: ', prompt);

      const targetSegments = 2;
      const videoPaths = await this.generateLongVideo(prompt, targetSegments);

      return videoPaths[videoPaths.length - 1];
    } catch (error) {
      console.error("ERROR GEMINI/VEO:", (error as Error).message);
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
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    return response.text || "";
  }

  private async generateLongVideo(prompt: string, segments: number): Promise<string[]> {
    const generatedFiles: string[] = [];
    let lastVideoReference: any = null;

    for (let i = 0; i < segments; i++) {
      let operation: any;

      if (i === 0) {
        // const imageBytes = await this.generateInitialImage(prompt);
        operation = await this.ai.models.generateVideos({
          model: "veo-3.1-generate-preview",
          prompt: prompt,
          config: { aspectRatio: "9:16" },
          // image: { imageBytes, mimeType: "image/png" },
        });
      } else {
        console.log(`Estendendo vídeo a partir do segmento anterior...`);
        operation = await this.ai.models.generateVideos({
          model: "veo-3.1-generate-preview",
          prompt: `Continue the previous scene: ${prompt}`,
          config: { aspectRatio: "9:16" },
          video: {
            videoFile: lastVideoReference,
          } as any,
        });
      }

      // Polling para aguardar a operação
      const result = await this.waitForOperation(operation);
      console.log('result:========> ', result);

      if (result.response?.generatedVideos?.[0]) {
        const videoData = result.response.generatedVideos[0];
        lastVideoReference = videoData.video; // Guarda a referência para o próximo loop

        const path = `segment_${i}_${Date.now()}.mp4`;
        await this.ai.files.download({
          file: videoData.video,
          downloadPath: path,
        });

        console.log('path: ', path);
        generatedFiles.push(path);
        console.log(`Segmento ${i} salvo em ${path}`);
      }
    }

    return generatedFiles;
  }

  private async generateInitialImage(prompt: string): Promise<string> {
    const imageResponse = await this.ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const candidate = imageResponse.candidates?.[0];
		const imagePart = candidate?.content?.parts?.find((p) => p.inlineData);

			if (!imagePart || !imagePart.inlineData) {
				throw new Error("Failed to generate reference image.");
			}
			const imageBytes = imagePart.inlineData.data;
      console.log('imageBytes: ', imageBytes);

    if (!imageBytes) throw new Error("Falha ao gerar imagem inicial.");
    return imageBytes;
  }

  private async waitForOperation(operation: any | undefined): Promise<any> {
    if (!operation) throw new Error("Operation name is undefined");

    while (!operation.done) {
      console.log("Awaiting video (10s)...");
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await this.ai.operations.getVideosOperation({
        operation: operation,
      });
    }

    if (operation.error) throw new Error(operation.error.message);
    return operation;
  }

}
