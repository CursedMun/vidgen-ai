import { schema } from "@/server/infrastructure/db"
import { publicProcedure, router } from "@/server/infrastructure/trpc/server"
import { desc, eq } from "drizzle-orm"
import z from "zod"

export const tasksRouter = router({
            list: publicProcedure.query(async ({ ctx }) => {
              return ctx.db
                .select()
                .from(schema.tasks)
                .orderBy(desc(schema.tasks.created_at))
            }),
            create: publicProcedure
              .input(z.object({ title: z.string().min(3).max(140) }))
              .mutation(async ({ ctx, input }) => {
                const [task] = await ctx.db
                  .insert(schema.tasks)
                  .values({ title: input.title })
                  .returning()
                return task
              }),
            toggle: publicProcedure
              .input(z.object({ id: z.number().int().positive(), isDone: z.boolean() }))
              .mutation(async ({ ctx, input }) => {
                const [task] = await ctx.db
                  .update(schema.tasks)
                  .set({ is_done: input.isDone })
                  .where(eq(schema.tasks.id, input.id))
                  .returning()
                return task
              }),
            remove: publicProcedure
              .input(z.object({ id: z.number().int().positive() }))
              .mutation(async ({ ctx, input }) => {
                await ctx.db.delete(schema.tasks).where(eq(schema.tasks.id, input.id))
                return { success: true }
          })
})