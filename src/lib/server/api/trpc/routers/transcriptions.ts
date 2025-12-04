import { getAudioTranscription } from "$lib/transcribe"
import { schema } from "@/server/infrastructure/db"
import { publicProcedure, router } from "@/server/infrastructure/trpc/server"
import { desc, eq, isNull } from "drizzle-orm"
import { z } from "zod"


// Helper to extract video ID from URL
const extractVideoId = (url: string) => {
  const patterns = [
    /[?&]v=([^&#]+)/,
    /https?:\/\/youtu\.be\/([^?&#]+)/,
    /\/embed\/([^?&#]+)/,
    /\/shorts\/([^?&#]+)/
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }
  return null
}

const getThumbnailFromId = (videoId: string | null) =>
  videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null

export const transcriptionsRouter = router({
    list: publicProcedure.query(async ({ ctx }) => {
      return ctx.db
        .select()
        .from(schema.transcriptions)
        .where(isNull(schema.transcriptions.channel_id))
        .orderBy(desc(schema.transcriptions.created_at))
    }),
    create: publicProcedure
      .input(z.object({ 
        videoUrl: z.string().url()
      }))
      .mutation(async ({ ctx, input }) => {
        const sanitizedUrl = input.videoUrl.trim()
        const downloadId = `download_${Date.now()}_${Math.random().toString(36).substring(7)}`
        
        try {
          const transcript = await getAudioTranscription(sanitizedUrl, downloadId)
          const videoId = extractVideoId(sanitizedUrl)
          const thumbnail = getThumbnailFromId(videoId)

          const [transcription] = await ctx.db
            .insert(schema.transcriptions)
            .values({
              channel_id: null,
              video_id: videoId,
              video_url: sanitizedUrl,
              thumbnail_url: thumbnail,
              status: "completed",
              transcript
            })
            .returning()

          return {
            success: true,
            transcription,
            downloadId
          }
        } catch (error) {
          throw new Error(
            error instanceof Error
              ? error.message
              : "Unable to transcribe that video."
          )
        }
      }),
    remove: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db.delete(schema.transcriptions).where(eq(schema.transcriptions.id, input.id))
        return { success: true }
      })
})

