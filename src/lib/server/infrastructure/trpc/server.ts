import { type TApp } from '@/server';
import { initTRPC } from '@trpc/server';

const t = initTRPC.context<TApp>().create();
export const router = t.router;
console.log({ t });
export const publicProcedure = t.procedure;
const authorized = () =>
  t.procedure.use((opts) => {
    return opts.next({
      ctx: {
        ...opts.ctx,
        // auth: opts.ctx.auth,
      },
    });
  });
export const protectedProcedure = {
  // acl,
  authorized,
};
