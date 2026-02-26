import { publicProcedure, router } from '@/server/infrastructure/trpc/server';
import { z } from 'zod';

export const accountRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.account.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }),

  listByPlatform: publicProcedure
    .input(z.object({ platform: z.enum(['instagram', 'youtube']) }))
    .query(async ({ ctx, input }) => {
      const accounts = await ctx.db.account.findMany({
        where: { platform: input.platform },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return accounts;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const account = await ctx.db.account.findUnique({
        where: { id: input.id },
        include: {
          workflows: true,
          workflowJobs: true,
        },
      });

      if (!account) return null;

      return {
        ...account,
        jsonData: JSON.parse(account.jsonData),
      };
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        platform: z.enum(['instagram', 'youtube']),
        jsonData: z.record(z.any(), z.any()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.account.create({
        data: {
          name: input.name,
          platform: input.platform,
          jsonData: JSON.stringify(input.jsonData),
        },
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).optional(),
        jsonData: z.record(z.any(), z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, jsonData, ...data } = input;
      return await ctx.db.account.update({
        where: { id },
        data: {
          ...data,
          ...(jsonData && { jsonData: JSON.stringify(jsonData) }),
        },
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.account.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),

  addInstagramAccount: publicProcedure
    .input(
      z.object({
        shortLivedToken: z.string(),
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const newAccount = await ctx.services.instagram.discoverAndSaveAccount(
        input.shortLivedToken,
        input.name,
      );

      return {
        success: true,
        account: newAccount,
      };
    }),

  accountInsights: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ctx.services.instagram.getInsights(input.id);
      return response;
    }),

  accountMedias: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ctx.services.instagram.getMedias(input.id);
      return response;
    }),
});
