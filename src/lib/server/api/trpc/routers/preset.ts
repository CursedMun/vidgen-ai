import { presets, publicationCrons } from '@/server/infrastructure/db/schema';
import { publicProcedure, router } from '@/server/infrastructure/trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const presetRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(presets);
  }),
  listCrons: publicProcedure.query(async ({ ctx }) => {
    const crons = await ctx.db.select({
      id: publicationCrons.id,
      title: publicationCrons.title,
      status: publicationCrons.status,
      interval: publicationCrons.interval,
      createdAt: publicationCrons.scheduledAt,
      presetName: presets.name,
    })
    .from(publicationCrons)
    .leftJoin(presets, eq(publicationCrons.presetId, presets.id))
    .orderBy(publicationCrons.id);
    return crons
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