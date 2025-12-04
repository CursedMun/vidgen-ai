import type { PageServerLoad } from "./$types"
import { getTrendIdeas } from "$lib/trends"
import { db } from "@/server/infrastructure/db"

export const load: PageServerLoad = async () => {
  const trendIdeas = await getTrendIdeas()
  const transcriptionsRows = await db.query.transcriptions.findMany({
    where: (table, { isNull }) => isNull(table.channel_id),
    orderBy: (table, { desc }) => desc(table.created_at)
  })

  const transcriptions = transcriptionsRows.map(row => ({
    ...row,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at ?? Date.now()).toISOString()
  }))

  // Load channels
  const channelsRows = await db.query.channels?.findMany({
    orderBy: (table, { desc }) => desc(table.created_at)
  }) || []

  const channels = channelsRows.map(row => ({
    ...row,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at ?? Date.now()).toISOString(),
    last_fetched_at: row.last_fetched_at instanceof Date ? row.last_fetched_at.toISOString() : row.last_fetched_at ? new Date(row.last_fetched_at).toISOString() : null
  }))

  // Load jobs (transcriptions with channel_id)
  const jobsRows = await db.query.transcriptions?.findMany({
    where: (table, { isNotNull }) => isNotNull(table.channel_id),
    orderBy: (table, { desc }) => desc(table.created_at),
    limit: 50
  }) || []

  const jobs = jobsRows.map(row => ({
    ...row,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at ?? Date.now()).toISOString(),
    started_at: row.started_at instanceof Date ? row.started_at.toISOString() : row.started_at ? new Date(row.started_at).toISOString() : null,
    completed_at: row.completed_at instanceof Date ? row.completed_at.toISOString() : row.completed_at ? new Date(row.completed_at).toISOString() : null
  }))

  return { trendIdeas, transcriptions, channels, jobs }
}
