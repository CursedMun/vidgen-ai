import { publicProcedure, router } from '@/server/infrastructure/trpc/server';
import { z } from 'zod';

export const presetRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.preset.findMany({
      include: {
        assets: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.preset.findUnique({
        where: { id: input.id },
        include: {
          workflows: true,
          assets: true,
          prompts: true,
        },
      });
    }),

  listWorkflows: publicProcedure.query(async ({ ctx }) => {
    const workflows = await ctx.db.workflow.findMany({
      include: {
        preset: {
          select: {
            name: true,
          },
        },
        source: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    return workflows;
  }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional().nullable(),
        assets: z.array(
          z.object({
            data: z.string(),
            type: z.string(),
          }),
        ),
        audioPromptId: z.int().optional().nullable(),
        imagePromptId: z.int().optional().nullable(),
        videoPromptId: z.int().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Create all assets first
      const createdAssets = await Promise.all(
        input.assets.map((asset) =>
          ctx.db.asset.create({
            data: {
              type: asset.type,
              url: asset.data,
            },
          }),
        ),
      );

      return await ctx.db.preset.create({
        data: {
          name: input.name,
          description: input.description,
          audioPromptId: input.audioPromptId,
          imagePromptId: input.imagePromptId,
          videoPromptId: input.videoPromptId,
          assets:
            createdAssets.length > 0
              ? { connect: createdAssets.map((a) => ({ id: a.id })) }
              : undefined,
        },
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().optional(),
        description: z.string().optional().nullable(),
        assets: z.array(
          z.object({
            data: z.string(),
            type: z.string(),
          }),
        ),
        audioPromptId: z.int().optional().nullable(),
        imagePromptId: z.int().optional().nullable(),
        videoPromptId: z.int().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, assets, ...data } = input;

      const prevPreset = await ctx.db.preset.findFirst({
        where: {
          id: id,
        },
        include: {
          assets: true,
        },
      });
      if (!prevPreset) return;
      // Delete existing assets for this preset
      await ctx.db.asset.deleteMany({
        where: {
          id: {
            in: prevPreset?.assets.map((x) => x.id),
          },
        },
      });

      // Create new assets
      const createdAssets = await Promise.all(
        assets.map((asset) =>
          ctx.db.asset.create({
            data: {
              type: asset.type,
              url: asset.data,
            },
          }),
        ),
      );

      return await ctx.db.preset.update({
        where: { id },
        data: {
          ...data,
          assets:
            createdAssets.length > 0
              ? { connect: createdAssets.map((a) => ({ id: a.id })) }
              : undefined,
        },
      });
    }),

  deletePreset: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await ctx.db.preset.delete({
        where: { id: input.id },
      });
    }),
});
