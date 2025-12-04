<script lang="ts">
  import type { TrendIdea } from '$lib/trends';
  import { createTrpcClient } from '$lib/trpc/client';
  import type { PageData } from './$types';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Badge } from '$lib/components/ui/badge';
  import * as Card from '$lib/components/ui/card';
  import ChannelsJobs from '$lib/components/channels-jobs.svelte';

  let { data }: { data: PageData } = $props();

  type StoredTranscription = {
    id: number;
    video_id: string | null;
    video_url: string;
    thumbnail_url: string | null;
    transcript: string | null;
    created_at: string;
  };

  let trendIdeas = $state(data.trendIdeas as TrendIdea[]);
  let transcriptions = $state(
    (data.transcriptions ?? []) as StoredTranscription[]
  );
  let errorMessage = $state<string | null>(null);
  let latestTranscript = $state<{
    videoUrl: string;
    transcript: string;
  } | null>(null);

  const formatTimestamp = (value: string) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));

  const snippet = (text: string | null, max = 240) => {
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max)}…` : text;
  };

  // Download progress tracking
  let downloadProgress = $state({ percent: 0, downloaded: 0, total: 0 });
  let isDownloading = $state(false);
  let downloadId = $state('');
  let videoUrl = $state('');

  // Track expanded transcripts
  let expandedTranscripts = $state(new Set<number>());

  const toggleTranscript = (id: number) => {
    if (expandedTranscripts.has(id)) {
      expandedTranscripts.delete(id);
    } else {
      expandedTranscripts.add(id);
    }
    expandedTranscripts = expandedTranscripts; // Trigger reactivity
  };

  const trpc = createTrpcClient();

  async function pollDownloadProgress(id: string) {
    isDownloading = true;
    downloadId = id;

    const interval = setInterval(async () => {
      try {
        const progress = await trpc.downloads.progress.query({
          downloadId: id
        });
        downloadProgress = progress;

        if (progress.percent >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            isDownloading = false;
            downloadProgress = { percent: 0, downloaded: 0, total: 0 };
          }, 2000);
        }
      } catch (error) {
        console.error('Error polling download progress:', error);
        clearInterval(interval);
        isDownloading = false;
      }
    }, 500);
  }

  async function handleTranscribe(event: Event) {
    event.preventDefault();

    if (!videoUrl.trim()) {
      errorMessage = 'Please provide a valid YouTube URL.';
      return;
    }

    errorMessage = null;
    latestTranscript = null;
    isDownloading = true;

    try {
      const result = await trpc.transcriptions.create.mutate({
        videoUrl: videoUrl.trim()
      });

      if (result.success) {
        latestTranscript = {
          videoUrl: result.transcription.video_url,
          transcript: result.transcription.transcript || ''
        };

        // Add to transcriptions list
        transcriptions = [
          {
            ...result.transcription,
            created_at: new Date().toISOString()
          },
          ...transcriptions
        ];

        // Start polling for download progress
        if (result.downloadId) {
          pollDownloadProgress(result.downloadId);
        }

        // Clear input
        videoUrl = '';
      }
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : 'Failed to transcribe video';
      isDownloading = false;
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / k ** i) * 100) / 100 + ' ' + sizes[i];
  };
</script>

<main class="container mx-auto flex flex-col py-8 gap-6 overflow-hidden">
  <!-- Channels and Jobs Management -->
  <ChannelsJobs channels={data.channels || []} jobs={data.jobs || []} />

  <section class="flex-1 flex gap-6 min-h-0">
    <!-- Transcription Form -->
    <div class="w-96 flex-none space-y-6">
      <Card.Root>
        <Card.Header>
          <Card.Description>Transcription Lab</Card.Description>
          <Card.Title>Gemini-Powered Transcription</Card.Title>
          <Card.Description>
            Drop any YouTube URL—short or long. We'll pull audio, feed the
            Gemini 2.5 Pro model, and return raw text.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <form onsubmit={handleTranscribe} class="space-y-4">
            <div class="space-y-2">
              <Label for="videoUrl">Video URL</Label>
              <Input
                id="videoUrl"
                bind:value={videoUrl}
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                required
                disabled={isDownloading}
              />
            </div>
            <Button type="submit" class="w-full" disabled={isDownloading}>
              {isDownloading ? 'Downloading...' : 'Run Transcription'}
            </Button>
          </form>

          {#if isDownloading}
            <div class="mt-4 space-y-3 rounded-lg border bg-muted/50 p-4">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">Download Progress</span>
                <Badge variant="secondary">{downloadProgress.percent}%</Badge>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  class="h-full rounded-full bg-primary transition-all duration-300 ease-in-out"
                  style="width: {downloadProgress.percent}%"
                ></div>
              </div>
              <div class="flex justify-between text-xs text-muted-foreground">
                <span
                  >{formatBytes(downloadProgress.downloaded)} / {formatBytes(
                    downloadProgress.total
                  )}</span
                >
                <span>ID: {downloadId.slice(0, 8)}...</span>
              </div>
            </div>
          {/if}

          {#if errorMessage}
            <div
              class="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {errorMessage}
            </div>
          {/if}

          {#if latestTranscript}
            <div class="mt-6 space-y-3 rounded-lg border bg-muted/50 p-4">
              <div class="space-y-1">
                <p class="text-sm font-medium">Latest Transcript</p>
                <p class="text-xs text-muted-foreground overflow-wrap-anywhere">
                  {latestTranscript.videoUrl}
                </p>
              </div>
              <div
                class="max-h-64 overflow-auto rounded-md border bg-background p-3 text-sm leading-relaxed"
              >
                {latestTranscript.transcript}
              </div>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    </div>

    <!-- Transcriptions Archive -->
    <Card.Root class="flex flex-col flex-1 min-h-0">
      <Card.Header class="flex-none">
        <div class="flex items-center justify-between">
          <div class="space-y-1.5">
            <Card.Description>Archive</Card.Description>
            <Card.Title>Saved Transcriptions</Card.Title>
          </div>
          <Badge
            variant="secondary"
            class="h-9 w-9 rounded-full p-0 flex items-center justify-center"
          >
            {transcriptions.length}
          </Badge>
        </div>
      </Card.Header>
      <Card.Content class="flex-1 overflow-hidden">
        {#if transcriptions.length}
          <div class="h-full space-y-3 overflow-y-auto pr-2">
            {#each transcriptions as item}
              {@const expanded = expandedTranscripts.has(item.id)}
              <div
                class="flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors"
              >
                <div class="flex gap-4">
                  {#if item.thumbnail_url}
                    <img
                      src={item.thumbnail_url}
                      alt="Video thumbnail"
                      class="h-16 w-24 shrink-0 rounded-md object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  {/if}
                  <div class="flex flex-1 flex-col gap-1.5 min-w-0">
                    <a
                      href={item.video_url}
                      target="_blank"
                      rel="noreferrer"
                      class="text-sm font-medium hover:underline overflow-wrap-anywhere"
                    >
                      {item.video_url}
                    </a>
                    <p class="text-xs text-muted-foreground">
                      {formatTimestamp(item.created_at)}
                    </p>
                  </div>
                </div>
                {#if item.transcript}
                  <div class="space-y-2">
                    <p
                      class="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap"
                    >
                      {expanded ? item.transcript : snippet(item.transcript)}
                    </p>
                    {#if item.transcript.length > 240}
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-8 text-xs"
                        onclick={() => toggleTranscript(item.id)}
                      >
                        {expanded ? 'Show less' : 'Show more'}
                      </Button>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <div class="rounded-lg border border-dashed p-8 text-center">
            <p class="text-sm text-muted-foreground">
              Transcribe a video to populate this feed.
            </p>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  </section>
</main>
