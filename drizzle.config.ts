import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/lib/server/infrastructure/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: './sqlite.db',
  },
});
