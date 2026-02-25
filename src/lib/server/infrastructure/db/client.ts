import { DATABASE_URL } from '$env/static/private';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  const connectionString = `${DATABASE_URL}`;
  console.log(connectionString);
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const db = globalThis.prisma ?? prismaClientSingleton();
db.$connect();
if (process.env.NODE_ENV !== 'production') globalThis.prisma = db;

export type TDatabase = typeof db;
