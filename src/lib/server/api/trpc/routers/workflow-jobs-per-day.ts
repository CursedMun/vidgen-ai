import { publicProcedure, router } from '@/server/infrastructure/trpc/server';
import { z } from 'zod';

export const workflowJobsPerDayRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.workflowJobsPerDay.findMany({
      orderBy: {
        type: 'asc',
      },
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.workflowJobsPerDay.findUnique({
        where: { id: input.id },
      });
    }),

  getByType: publicProcedure
    .input(
      z.object({
        type: z.enum([
          'video_ideas_fetching',
          'video_generation',
          'video_publish_with_sound',
          'video_publish',
          'image_generation',
          'image_publish',
        ]),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.db.workflowJobsPerDay.findUnique({
        where: { type: input.type },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        type: z.enum([
          'video_ideas_fetching',
          'video_generation',
          'video_publish_with_sound',
          'video_publish',
          'image_generation',
          'image_publish',
        ]),
        count: z.number().int().nonnegative(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.workflowJobsPerDay.create({
        data: {
          type: input.type,
          count: input.count,
        },
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        count: z.number().int().nonnegative().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      return await ctx.db.workflowJobsPerDay.update({
        where: { id },
        data,
      });
    }),

  updateByType: publicProcedure
    .input(
      z.object({
        type: z.enum([
          'video_ideas_fetching',
          'video_generation',
          'video_publish_with_sound',
          'video_publish',
          'image_generation',
          'image_publish',
        ]),
        count: z.number().int().nonnegative(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.workflowJobsPerDay.update({
        where: { type: input.type },
        data: { count: input.count },
      });
    }),

  upsertByType: publicProcedure
    .input(
      z.object({
        type: z.enum([
          'video_ideas_fetching',
          'video_generation',
          'video_publish_with_sound',
          'video_publish',
          'image_generation',
          'image_publish',
        ]),
        count: z.number().int().nonnegative(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.workflowJobsPerDay.upsert({
        where: { type: input.type },
        update: { count: input.count },
        create: {
          type: input.type,
          count: input.count,
        },
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.workflowJobsPerDay.delete({
        where: { id: input.id },
      });
    }),

  deleteByType: publicProcedure
    .input(
      z.object({
        type: z.enum([
          'video_ideas_fetching',
          'video_generation',
          'video_publish_with_sound',
          'video_publish',
          'image_generation',
          'image_publish',
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.workflowJobsPerDay.delete({
        where: { type: input.type },
      });
    }),

  incrementCount: publicProcedure
    .input(
      z.object({
        type: z.enum([
          'video_ideas_fetching',
          'video_generation',
          'video_publish_with_sound',
          'video_publish',
          'image_generation',
          'image_publish',
        ]),
        increment: z.number().int().positive().default(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.workflowJobsPerDay.upsert({
        where: { type: input.type },
        update: {
          count: {
            increment: input.increment,
          },
        },
        create: {
          type: input.type,
          count: input.increment,
        },
      });
    }),

  resetCount: publicProcedure
    .input(
      z.object({
        type: z.enum([
          'video_ideas_fetching',
          'video_generation',
          'video_publish_with_sound',
          'video_publish',
          'image_generation',
          'image_publish',
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.workflowJobsPerDay.update({
        where: { type: input.type },
        data: { count: 0 },
      });
    }),

  resetAllCounts: publicProcedure.mutation(async ({ ctx }) => {
    return await ctx.db.workflowJobsPerDay.updateMany({
      data: { count: 0 },
    });
  }),
});
