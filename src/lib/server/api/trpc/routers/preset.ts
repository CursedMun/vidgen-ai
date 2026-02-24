import { cronExecutions, presets, publicationCrons } from '@/server/infrastructure/db/schema';
import { publicProcedure, router } from '@/server/infrastructure/trpc/server';
import { eq, inArray } from 'drizzle-orm';
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
      description: z.string().optional().nullable(),
      imagePrompt: z.string(),
      videoPrompt: z.string(),
      audioPrompt: z.string(),
      avatar: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.insert(presets).values(input);
    }),

  deletePreset: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await ctx.db.transaction(async (tx) => {
        // Delete the cron executions for this preset.
        await tx.delete(cronExecutions)
          .where(inArray(
            cronExecutions.cronId,
            tx.select({ id: publicationCrons.id })
              .from(publicationCrons)
              .where(eq(publicationCrons.presetId, input.id))
          ));

        // Delete the crons.
        await tx.delete(publicationCrons)
          .where(eq(publicationCrons.presetId, input.id));

        // Delete the preset.
        return await tx.delete(presets)
          .where(eq(presets.id, input.id));
      });
    }),
});