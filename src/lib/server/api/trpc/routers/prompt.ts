import { publicProcedure, router } from '@/server/infrastructure/trpc/server';
import { z } from 'zod';

export const promptRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.prompt.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        assets: true,
      },
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.prompt.findUnique({
        where: { id: input.id },
        include: {
          assets: true,
          presets: true,
        },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        content: z.string().min(1),
        type: z.enum(['video', 'image', 'audio']),
        image: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let assetId;
      if (input.image) {
        const asset = await ctx.db.asset.create({
          data: {
            type: 'image',
            url: input.image,
          },
        });
        assetId = asset.id;
      }
      return await ctx.db.prompt.create({
        data: {
          title: input.title,
          content: input.content,
          type: input.type,
          assets: assetId ? { connect: { id: assetId } } : undefined,
        },
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().min(1),
        content: z.string().min(1),
        type: z.enum(['video', 'image', 'audio']),
        image: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Handle image update if provided
      let assetId;
      if (input.image) {
        // Check if prompt already has an asset
        const existingPrompt = await ctx.db.prompt.findUnique({
          where: { id: input.id },
          include: { assets: true },
        });

        if (existingPrompt?.assets && existingPrompt.assets.length > 0) {
          // Update existing asset
          await ctx.db.asset.update({
            where: { id: existingPrompt.assets[0].id },
            data: { url: input.image },
          });
          assetId = existingPrompt.assets[0].id;
        } else {
          // Create new asset
          const asset = await ctx.db.asset.create({
            data: {
              type: 'image',
              url: input.image,
            },
          });
          assetId = asset.id;
        }
      }

      return await ctx.db.prompt.update({
        where: { id: input.id },
        data: {
          title: input.title,
          content: input.content,
          type: input.type,
          assets: assetId ? { connect: { id: assetId } } : undefined,
        },
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.prompt.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),
});
