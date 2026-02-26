import { publicProcedure, router } from '@/server/infrastructure/trpc/server';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const videoRouter = router({
  listMedia: publicProcedure.query(async ({ ctx }) => {
    const videos = await ctx.db.video.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const media = videos
      .map((video) => {
        const fullPath = path.resolve(video.path);

        if (!fs.existsSync(fullPath)) {
          return null;
        }

        const fileName = path.basename(video.path);

        const relativePath = video.path.replace('static/', 'static/');

        return {
          id: video.id.toString(),
          name: fileName,
          url: fileName,
          relativePath: relativePath,
          type: 'video' as const,
          createdAt: video.createdAt,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return media;
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
});
