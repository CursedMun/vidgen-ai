import { publicProcedure, router } from '@/server/infrastructure/trpc/server';
import { z } from 'zod';


export const publicationRouter = router({
    createCron: publicProcedure
      .input(z.object({
        presetId: z.number(),
        selectedAccounts: z.array(z.object({
          id: z.number(),
          name: z.string(),
          displayType: z.enum(['instagram', 'youtube']),
          instagramBusinessId: z.string().optional().nullable(),
          youtubeChannelId: z.string().optional().nullable(),
        })),
        sourceUrl: z.string(),
        interval: z.string(),
        mediaType: z.string(),
        aiModel: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
            const schedule =  await ctx.services.automation.setupCron(input);
            console.log('schedule: ', schedule);
            return
        } catch (error: any) {
            console.error('Error:', error.message);
            throw new Error(`Error: ${error.message}`);
      }
      }),
  });