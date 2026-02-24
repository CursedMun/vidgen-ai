import { schema } from '@/server/infrastructure/db/client';
import { publicProcedure, router } from '@/server/infrastructure/trpc/server';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const videoRouter = router({
  listMedia: publicProcedure.query(async () => {
    const videoDir = path.resolve('static/final_videos');
    const imageDir = path.resolve('static/images');
    const videos = fs.existsSync(videoDir)
      ? fs.readdirSync(videoDir)
          .filter((file) => file.endsWith('.mp4'))
          .map((file) => ({
            id: `video-${file}`,
            name: file,
            url: `/final_videos/${file}`,
            relativePath: `/final_videos/${file}`,
            type: 'video' as const,
            createdAt: fs.statSync(path.join(videoDir, file)).birthtime,
          }))
      : [];
    const images = fs.existsSync(imageDir)
      ? fs.readdirSync(imageDir)
          .filter(file => /\.(png|jpg|jpeg|webp)$/i.test(file))
          .map(file => ({
            id: `image-${file}`,
            name: file,
            url: `/images/${file}`,
            relativePath: `/images/${file}`,
            type: 'image' as const,
            createdAt: fs.statSync(path.join(imageDir, file)).birthtime
          }))
      : [];

    return [...videos, ...images]
  }),
  generate: publicProcedure
    .input(
      z.object({
        transcriptionId: z.number(),
        transcription: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.services.video.generateVideo("", "", input.transcription, "chatgpt");
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
        platform: z.enum(['instagram', 'x', 'tiktok', 'youtube']),
        caption: z.string().optional(),
        type: z.enum(['image', 'video']),
        accountId: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      console.log('input: ', input);
      if (input.platform === 'instagram') {
        if (!input.accountId) throw new Error("Account ID is required for Instagram.");
      }
      const { filename, platform, caption, type } = input;
      if (platform === 'instagram' || platform === 'youtube' || platform === 'x') {
        try {
          // const result = await ctx.services.video.publishVideo(
          //   publicMidiaUrl,
          //   caption || 'Conteúdo gerado por IA',
          //   platform,
          //   type,
          //   input.accountId
          // );
          return { success: true, id: "" };
        } catch (error: any) {
          console.error('Error in Instagram post:', error.message);
          throw new Error(`Error Instagram: ${error.message}`);
        }
      }

      if (platform === 'tiktok') {
        throw new Error(
          `Publicação para ${platform} ainda em desenvolvimento.`,
        );
      }

      return { success: false };
    }),
  addInstagramAccount: publicProcedure
    .input(z.object({
      shortLivedToken: z.string(),
      name: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const newAccount = await ctx.services.instagram.discoverAndSaveAccount(
        input.shortLivedToken,
        input.name
      );

      return {
        success: true,
        account: newAccount
      };
    }),

  listInstagramAccounts: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db
      .select()
      .from(schema.instagramAccounts);
  }),
  listYoutubeAccounts: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db
      .select()
      .from(schema.youtubeAccounts);
  }),
  authorizeX: publicProcedure.query(async ({ ctx }) => {
    const authUrl = await ctx.services.twitter.authLink(ctx.cookies);
    return { success: true, redirectUrl: authUrl };
  }),
});
