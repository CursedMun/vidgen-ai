import { publicProcedure, router } from '@/server/infrastructure/trpc/server';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const videoRouter = router({
  list: publicProcedure.query(async () => {
    const videoDir = path.resolve('static/final_videos');
    if (!fs.existsSync(videoDir)) return [];

    const files = fs.readdirSync(videoDir);

    return files
      .filter(file => file.endsWith('.mp4'))
      .map(file => ({
        id: file,
        name: file,
        url: `/final_videos/${file}`,
        relativePath: `/final_videos/${file}`,
        createdAt: fs.statSync(path.join(videoDir, file)).birthtime
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }),

  generate: publicProcedure
    .input(
      z.object({
        transcriptionId: z.number(),
        transcription: z.string()
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.services.video.generateVideo(input.transcription);
    }),
  remove: publicProcedure
    .input(z.object({ filename: z.string() }))
    .mutation(async ({ input }) => {
      const filePath = path.resolve('static/final_videos', input.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { success: true };
      }
      return { success: false };
    }),
    publish: publicProcedure
    .input(
      z.object({
        filename: z.string(),
        platform: z.enum(['instagram', 'x', 'tiktok']),
        caption: z.string().optional(),
        publicBaseUrl: z.string().url(), // URL do Cloudflare/LocalTunnel
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { filename, platform, caption, publicBaseUrl } = input;
      const relativePath = `/final_videos/${filename}`;
      const publicVideoUrl = `${publicBaseUrl}${relativePath}`;

      console.log(`🚀 Publicando no ${platform}: ${publicVideoUrl}`);

      if (platform === 'instagram') {
        try {
          const result = await ctx.services.video.publishVideo(
            publicVideoUrl,
            caption || "Conteúdo gerado por IA #Sportiz",
            platform
          );
          return { success: true, id: result };
        } catch (error: any) {
          console.error('Error in Instagram post:', error.message);
          throw new Error(`Error Instagram: ${error.message}`);
        }
      }

      // Placeholder para outras redes
      if (platform === 'x' || platform === 'tiktok') {
        throw new Error(`Publicação para ${platform} ainda em desenvolvimento.`);
      }

      return { success: false };
    }),
});