import { schema } from '@/server/infrastructure/db/client';
import { publicProcedure, router } from '@/server/infrastructure/trpc/server';
import { desc, eq, isNotNull } from 'drizzle-orm';
import { z } from 'zod';

export const transcriberRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(schema.transcriptions)
      .where(isNotNull(schema.transcriptions.channel_id))
      .orderBy(desc(schema.transcriptions.created_at));
  }),
  create: publicProcedure
    .input(
      z.object({
        videoUrl: z.url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.services.transcriber.transcribeVideo(input.videoUrl);
    }),
  remove: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const resp = await ctx.db
        .delete(schema.transcriptions)
        .where(eq(schema.transcriptions.id, input.id));
      return { success: resp.changes > 0 };
    }),
});
