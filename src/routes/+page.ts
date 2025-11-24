import type { PageLoad } from './$types';
import { createTrpcClient } from '$lib/trpc/client';

export const load: PageLoad = async ({ fetch }) => {
	const trpc = createTrpcClient(fetch);
	const tasks = await trpc.tasks.list.query();

	return { tasks };
};

