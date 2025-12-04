import { trpcHandler } from '@/server/infrastructure/trpc/server';
import type { RequestHandler } from './$types';

const handler: RequestHandler = (event) => trpcHandler(event);

export const GET = handler;
export const POST = handler;

