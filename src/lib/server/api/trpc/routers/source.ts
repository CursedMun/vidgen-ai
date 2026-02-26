import { publicProcedure, router } from '@/server/infrastructure/trpc/server';
import { z } from 'zod';

export const sourceRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.source.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.source.findUnique({
        where: { id: input.id },
        include: {
          workflows: true,
        },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        url: z.string().url(),
        type: z.enum(['youtube', 'rss']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.source.create({
        data: {
          name: input.name,
          url: input.url,
          type: input.type,
        },
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).optional(),
        url: z.string().url().optional(),
        type: z.enum(['youtube', 'rss']).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return await ctx.db.source.update({
        where: { id },
        data,
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.source.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),

  testYoutubeChannel: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.services.youtube.getYoutubeAccountByLink(
        input.url,
      );
      return result;
    }),
});
