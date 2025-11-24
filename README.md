# Bun + Svelte + Drizzle + tRPC

This repo is a minimal example that wires up the requested stack end-to-end using the newest releases as of **24 Nov 2025**:

| Tool | Version |
| --- | --- |
| [Bun](https://bun.sh) | `1.2.23` |
| [Svelte](https://svelte.dev) | `5.43.14` |
| [SvelteKit](https://kit.svelte.dev) | `2.49.0` |
| [tRPC](https://trpc.io) | `11.7.2` |
| [Drizzle ORM](https://orm.drizzle.team) | `0.44.7` |
| [drizzle-kit](https://orm.drizzle.team/docs/kit) | `0.31.7` |

## Getting started

```sh
# install deps
bun install

# run the dev server
bun run dev
```

Visit http://localhost:5173 to use the task tracker demo. New tasks plus toggle/delete actions are persisted with Drizzle + SQLite and flow through the `/api/trpc` endpoint.

## Database + migrations

The project ships with a `drizzle.config.ts` that targets Bun's built-in SQLite driver. Helpful scripts:

```sh
# generate SQL from the schema
bun run db:generate

# push the schema to sqlite.db
bun run db:push

# open the Drizzle studio UI
bun run db:studio

# seed demo rows (idempotent)
bun run db:seed
```

`sqlite.db` is ignored by git so you can reset freely. The generated SQL lives under `drizzle/`.

## Production build

```sh
bun run build
bun run preview
```

Add a SvelteKit adapter before deploying to your preferred target.
