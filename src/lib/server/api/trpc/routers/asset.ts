import { publicProcedure, router } from '@/server/infrastructure/trpc/server';
import { z } from 'zod';

export const assetRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.asset.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.asset.findUnique({
        where: { id: input.id },
        include: {
          prompts: true,
          presets: true,
        },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        url: z.string(),
        type: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.asset.create({
        data: {
          url: input.url,
          type: input.type,
        },
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        url: z.string().url().optional(),
        type: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return await ctx.db.asset.update({
        where: { id },
        data,
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.asset.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),
});
