import type { Context } from "@/server/infrastructure/trpc/context";
import { router } from "@/server/infrastructure/trpc/server";
import { initTRPC } from "@trpc/server";


export const appRouter = router({
  auth: authRouter,
  info: infoRouter,
  withdraw: withdrawRouter,
  statistics: statisticsRouter,
});

export type AppRouter = typeof appRouter;

