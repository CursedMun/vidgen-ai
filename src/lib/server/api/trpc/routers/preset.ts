import { presets } from '@/server/infrastructure/db/schema';
import { publicProcedure, router } from '@/server/infrastructure/trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const presetRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(presets);
  }),

  create: publicProcedure
    .input(z.object({
      name: z.string(),
      imagePrompt: z.string(),
      videoPrompt: z.string(),
      audioPrompt: z.string(),
      avatar: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.insert(presets).values(input);
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.delete(presets).where(eq(presets.id, input.id));
    })
});