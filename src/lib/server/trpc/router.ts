import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import type { Context } from './context';
import { schema } from '$lib/server/db';
import { desc, eq } from 'drizzle-orm';

const t = initTRPC.context<Context>().create();

export const appRouter = t.router({
	tasks: t.router({
		list: t.procedure.query(async ({ ctx }) => {
			return ctx.db
				.select()
				.from(schema.tasks)
				.orderBy(desc(schema.tasks.created_at));
		}),
		create: t.procedure
			.input(z.object({ title: z.string().min(3).max(140) }))
			.mutation(async ({ ctx, input }) => {
				const [task] = await ctx.db
					.insert(schema.tasks)
					.values({ title: input.title })
					.returning();
				return task;
			}),
		toggle: t.procedure
			.input(z.object({ id: z.number().int().positive(), isDone: z.boolean() }))
			.mutation(async ({ ctx, input }) => {
				const [task] = await ctx.db
					.update(schema.tasks)
					.set({ is_done: input.isDone })
					.where(eq(schema.tasks.id, input.id))
					.returning();
				return task;
			}),
		remove: t.procedure
			.input(z.object({ id: z.number().int().positive() }))
			.mutation(async ({ ctx, input }) => {
				await ctx.db.delete(schema.tasks).where(eq(schema.tasks.id, input.id));
				return { success: true };
			})
	})
});

export type AppRouter = typeof appRouter;

