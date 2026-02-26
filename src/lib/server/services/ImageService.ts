import fs from 'node:fs';
import path from 'node:path';
import type { OpenAI } from 'openai';
export class ImageService {
  constructor(private openai: OpenAI) {}
  private async generateInitialImage(prompt: string): Promise<string> {
    const response = await this.openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1792', // 9:16
      response_format: 'b64_json',
    });

    const base64Data = response.data?.[0].b64_json;
    if (!base64Data) throw new Error('Failed to generate image with DALL-E');

    return base64Data;
  }
  public async generateImage(prompt: string): Promise<string> {
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
}
