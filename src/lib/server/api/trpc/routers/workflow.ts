import { publicProcedure, router } from '@/server/infrastructure/trpc/server';
import { z } from 'zod';

export const workflowRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.workflow.findMany({
      include: {
        preset: true,
        accounts: true,
        workflowRuns: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.workflow.findUnique({
        where: { id: input.id },
        include: {
          preset: true,
          accounts: true,
          workflowRuns: true,
        },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        interval: z.string(),
        mediaType: z.enum(['video', 'image']),
        model: z.enum(['veo', 'chatgpt']),
        sourceId: z.number().int().positive().optional(),
        presetId: z.number().int().positive(),
        accountIds: z.array(z.number().int().positive()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountIds, ...workflowData } = input;

      return await ctx.db.workflow.create({
        data: {
          ...workflowData,
          accounts: { connect: accountIds?.map((id) => ({ id })) },
        },
        include: {
          accounts: true,
        },
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.int(),
        title: z.string().min(1),
        description: z.string().optional(),
        interval: z.string(),
        mediaType: z.enum(['video', 'image']),
        model: z.enum(['veo', 'chatgpt']),
        sourceId: z.number().int().positive().optional(),
        presetId: z.number().int().positive(),
        accountIds: z.array(z.number().int().positive()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, accountIds, ...data } = input;
      return await ctx.db.workflow.update({
        where: { id },
        data: {
          ...data,
          accounts: { connect: accountIds?.map((id) => ({ id })) },
        },
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Delete all workflow runs (jobs will cascade delete due to onDelete: Cascade)
      await ctx.db.workflowRun.deleteMany({
        where: { workflowId: input.id },
      });

      // Delete the workflow
      return await ctx.db.workflow.delete({
        where: { id: input.id },
      });
    }),

  run: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await ctx.db.workflow.findUnique({
        where: { id: input.id },
      });

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      return await ctx.db.workflow.update({
        where: { id: input.id },
        data: { status: 'processing' },
      });
    }),
});
