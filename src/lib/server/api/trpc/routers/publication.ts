import { publicProcedure, router } from '@/server/infrastructure/trpc/server';
import { z } from 'zod';


export const publicationRouter = router({
    createCron: publicProcedure
      .input(z.object({
        presetId: z.number(),
        platforms: z.object({ instagram: z.boolean(), youtube: z.boolean() }),
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