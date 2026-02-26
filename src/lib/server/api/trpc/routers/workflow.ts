import { publicProcedure, router } from '@/server/infrastructure/trpc/server';
import { z } from 'zod';

export const workflowRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.workflow.findMany({
      include: {
        source: true,
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
          source: true,
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
        jobsPerInterval: z.number().int().min(0).default(0),
        type: z.enum([
          'video_ideas_fetching',
          'video_generation',
          'video_publish_with_sound',
          'video_publish',
          'image_generation',
          'image_publish',
        ]),
        model: z.enum(['veo', 'chatgpt']).default('chatgpt'),
        status: z
          .enum(['processing', 'active', 'deactivated'])
          .default('active'),
        sourceId: z.number().int().positive(),
        presetId: z.number().int().positive().optional(),
        accountIds: z.array(z.number().int().positive()).optional(),
        lastRunAt: z.date().optional(),
        nextRunAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { accountIds, ...workflowData } = input;

      return await ctx.db.workflow.create({
        data: {
          ...workflowData,
          accounts: accountIds?.length
            ? { connect: accountIds.map((id) => ({ id })) }
            : undefined,
        },
        include: {
          source: true,
          preset: true,
          accounts: true,
        },
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.int(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        interval: z.string().optional(),
        jobsPerInterval: z.number().int().min(0).optional(),
        type: z
          .enum([
            'video_ideas_fetching',
            'video_generation',
            'video_publish_with_sound',
            'video_publish',
            'image_generation',
            'image_publish',
          ])
          .optional(),
        model: z.enum(['veo', 'chatgpt']).optional(),
        status: z.enum(['processing', 'active', 'deactivated']).optional(),
        sourceId: z.number().int().positive().optional(),
        presetId: z.number().int().positive().optional().nullable(),
        accountIds: z.array(z.number().int().positive()).optional(),
        lastRunAt: z.date().optional().nullable(),
        nextRunAt: z.date().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, accountIds, ...data } = input;

      return await ctx.db.workflow.update({
        where: { id },
        data: {
          ...data,
          accounts: accountIds
            ? { set: accountIds.map((id) => ({ id })) }
            : undefined,
        },
        include: {
          source: true,
          preset: true,
          accounts: true,
        },
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Delete all workflow jobs first
      await ctx.db.workflowJob.deleteMany({
        where: { workflowId: input.id },
      });

      // Delete all workflow runs
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
        data: {
          status: 'processing',
          lastRunAt: new Date(),
        },
      });
    }),
});
