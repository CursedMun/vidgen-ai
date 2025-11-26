import { createTrpcClient } from "$lib/trpc/client";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
  const trpc = createTrpcClient(fetch);
  const tasks = await trpc.tasks.list.query();

  return { tasks };
};
