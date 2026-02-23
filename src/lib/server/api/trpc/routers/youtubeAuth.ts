import { publicProcedure, router } from '@/server/infrastructure/trpc/server';
import { z } from 'zod';

export const youtubeAuthRouter = router({
  getAuthUrl: publicProcedure.query(async ({ ctx }) => {
    return ctx.services.youtube.getAuthUrl()
  }),
  saveAccount: publicProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
        return ctx.services.youtube.saveYotubeAccount(input.code)
    })
});