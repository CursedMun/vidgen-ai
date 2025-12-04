import { schema } from "@/server/infrastructure/db"
import { publicProcedure, router } from "@/server/infrastructure/trpc/server"
import { desc, eq } from "drizzle-orm"
import z from "zod"

export const channelsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
          return ctx.db
            .select()
            .from(schema.channels)
            .orderBy(desc(schema.channels.created_at))
        }),
        create: publicProcedure
          .input(z.object({
            channelName: z.string().min(1),
            fetchIntervalMinutes: z.number().min(5).default(30)
          }))
          .mutation(async ({ ctx, input }) => {
            // Find channel ID by name
            const channelId = await findChannelIdByName(input.channelName)
            if (!channelId) {
              throw new Error(`Channel "${input.channelName}" not found`)
            }
    
            // Create channel
            const [channel] = await ctx.db
              .insert(schema.channels)
              .values({
                channel_name: input.channelName,
                channel_id: channelId,
                fetch_interval_minutes: input.fetchIntervalMinutes,
                is_active: true
              })
              .returning()
    
            // Start monitoring
            startChannelMonitoring(channel)
    
            return channel
          }),
        toggle: publicProcedure
          .input(z.object({ id: z.number().int().positive(), isActive: z.boolean() }))
          .mutation(async ({ ctx, input }) => {
            const [channel] = await ctx.db
              .update(schema.channels)
              .set({ is_active: input.isActive })
              .where(eq(schema.channels.id, input.id))
              .returning()
    
            // Start or stop monitoring
            if (input.isActive) {
              startChannelMonitoring(channel)
            } else {
              stopChannelMonitoring(channel.id)
            }
    
            return channel
          }),
        remove: publicProcedure
          .input(z.object({ id: z.number().int().positive() }))
          .mutation(async ({ ctx, input }) => {
            stopChannelMonitoring(input.id)
            await ctx.db.delete(schema.channels).where(eq(schema.channels.id, input.id))
            return { success: true }
          }),
        updateInterval: publicProcedure
          .input(z.object({
            id: z.number().int().positive(),
            intervalMinutes: z.number().min(5)
          }))
          .mutation(async ({ ctx, input }) => {
            const [channel] = await ctx.db
              .update(schema.channels)
              .set({ fetch_interval_minutes: input.intervalMinutes })
              .where(eq(schema.channels.id, input.id))
              .returning()
    
            // Restart monitoring with new interval
            if (channel.is_active) {
              startChannelMonitoring(channel)
            }
    
            return channel
          })
})