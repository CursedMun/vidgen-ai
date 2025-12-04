import { schema } from "@/server/infrastructure/db"
import { publicProcedure, router } from "@/server/infrastructure/trpc/server"
import { desc, eq, isNotNull } from "drizzle-orm"
import z from "zod"

export const channelsRouter = router({
      list: publicProcedure.query(async ({ ctx }) => {
        return ctx.db
          .select()
          .from(schema.transcriptions)
          .where(isNotNull(schema.transcriptions.channel_id))
          .orderBy(desc(schema.transcriptions.created_at))
      }),
      retry: publicProcedure
        .input(z.object({ id: z.number().int().positive() }))
        .mutation(async ({ ctx, input }) => {
          await ctx.db
            .update(schema.transcriptions)
            .set({
              status: "pending",
              error_message: null,
              started_at: null,
              completed_at: null
            })
            .where(eq(schema.transcriptions.id, input.id))
  
          // Trigger job processing
          processJobs()
  
          return { success: true }
        }),
      remove: publicProcedure
        .input(z.object({ id: z.number().int().positive() }))
        .mutation(async ({ ctx, input }) => {
          await ctx.db.delete(schema.transcriptions).where(eq(schema.transcriptions.id, input.id))
          return { success: true }
        })
})