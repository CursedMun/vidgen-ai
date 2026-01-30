<script lang="ts">
  import ChannelsJobs from '$lib/components/channels-jobs.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { createTrpcClient } from '$lib/trpc/client';
  import { formatTimestamp, snippet } from '@/utils';
  const trpc = createTrpcClient();

  let transcriptions = $state(
    [] as Awaited<ReturnType<typeof trpc.transcriber.list.query>>,
  );
  let channels = $state(
    [] as Awaited<ReturnType<typeof trpc.channels.list.query>>,
  );

  let generatedVideos = $state<{ id: string; url: string; name: string; relativePath: string }[]>([]);
  let isGeneratingVideoId = $state<number | null>(null);
  let isPublishing = $state<string | null>(null);

  const load = async () => {
    transcriptions = await trpc.transcriber.list.query();
    channels = await trpc.channels.list.query();
    generatedVideos = await trpc.videos.list.query();
  };

  async function publishVideo(video: any, platform: 'instagram' | 'x' | 'tiktok') {
  const idKey = `${video.id}-${platform}`;
  isPublishing = idKey;
  
  try {
    // url cloudflare
    const publicBaseUrl = "https://clothes-singer-distributed-walnut.trycloudflare.com"; 

    const result = await trpc.videos.publish.mutate({
      filename: video.name,
      platform,
      caption: "Teste direto do Dashboard! ⚽️",
      publicBaseUrl
    });

    if (result.success) {
      alert(`Posted successfully on ${platform}!`);
    }
  } catch (error: any) {
    alert(`Error: ${error.message}`);
  } finally {
    isPublishing = null;
  }
}

  $effect(() => {
    load();
  });
  
  let errorMessage = $state<string | null>(null);
  let latestTranscript = $state<{
    videoUrl: string;
    transcript: string;
  } | null>(null);

  async function generateVideo(id: number, text?: string) {
    isGeneratingVideoId = id;
    try {
      await trpc.videos.generate.mutate({ transcriptionId: id, transcription: text || "" });
      generatedVideos = await trpc.videos.list.query();
      alert("Video successfully generated.");
    } catch (error) {
      errorMessage = "Error generating video.";
    } finally {
      isGeneratingVideoId = null;
    }
  }
  
  // Download progress tracking
  let isDownloading = $state(false);
  let videoUrl = $state('');

  // Track expanded transcripts
  let expandedTranscripts = $state<Record<number, boolean>>({});
  const toggleTranscript = (id: number) => {
    expandedTranscripts[id] = !expandedTranscripts[id]; // Trigger reactivity
  };

  let loadingVideoId = $state(false);
  const loadVideo = (id: number) => {
    loadingVideoId = !loadingVideoId;
  };

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
      const result = await trpc.transcriber.create.mutate({
        videoUrl: videoUrl.trim(),
      });
      await load();
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : 'Failed to transcribe video';
      isDownloading = false;
    }
  }
</script>

<main class="container mx-auto flex flex-col py-8 gap-6 overflow-hidden">
  <!-- Channels and Jobs Management -->
  <ChannelsJobs channels={channels || []} />

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
          <div class="space-y-4">
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
            <Button
              type="submit"
              class="w-full"
              disabled={isDownloading}
              onclick={handleTranscribe}
            >
              {isDownloading ? 'Downloading...' : 'Run Transcription'}
            </Button>
          </div>

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
              {@const expanded = !!expandedTranscripts[item.id]}
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
                <div class="flex items-center justify-end gap-2 p-2 border-t mt-2">
                  <Button
                    size="sm"
                    variant="default"
                    class="bg-blue-600 hover:bg-blue-700"
                    disabled={isGeneratingVideoId === item.id}
                    onclick={() => generateVideo(item.id, item.transcript)}
                  >
                    {isGeneratingVideoId === item.id ? '🎬 Gerando...' : '🎬 Gerar Vídeo'}
                  </Button>
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

  <section class="mt-6">
    <Card.Root>
      <Card.Header>
        <div class="flex items-center justify-between">
          <div class="space-y-1.5">
            <Card.Description>Videos</Card.Description>
            <Card.Title>Ready to Publish</Card.Title>
          </div>
          <Badge variant="outline">{generatedVideos.length} Vídeos</Badge>
        </div>
      </Card.Header>
      <Card.Content>
        {#if generatedVideos.length}
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {#each generatedVideos as video}
              <div class="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm">
                <div class="aspect-[9/16] w-full overflow-hidden rounded-lg bg-black">
                  <video src={video.url} controls class="h-full w-full object-cover">
                    <track kind="captions" />
                  </video>
                </div>
                
                <p class="text-xs font-medium truncate px-1">{video.name}</p>
                
                <div class="grid grid-cols-1 gap-2 mt-auto">
                  <Button 
                    size="sm" 
                    variant="outline"
                    class="w-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-pink-200 hover:bg-pink-500 hover:text-white"
                    disabled={isPublishing === `${video.id}-instagram`}
                    onclick={() => publishVideo(video, 'instagram')}
                  >
                    {isPublishing === `${video.id}-instagram` ? 'Enviando...' : '📸 Instagram Reels'}
                  </Button>

                  <Button 
                    size="sm" 
                    variant="outline"
                    class="w-full hover:bg-black hover:text-white"
                    disabled={isPublishing === `${video.id}-tiktok`}
                    onclick={() => publishVideo(video, 'tiktok')}
                  >
                    {isPublishing === `${video.id}-tiktok` ? 'Enviando...' : '🎵 TikTok'}
                  </Button>

                  <Button 
                    size="sm" 
                    variant="outline"
                    class="w-full hover:bg-sky-500 hover:text-white"
                    disabled={isPublishing === `${video.id}-x`}
                    onclick={() => publishVideo(video, 'x')}
                  >
                    {isPublishing === `${video.id}-x` ? 'Enviando...' : '🐦 X (Twitter)'}
                  </Button>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="flex h-32 items-center justify-center rounded-lg border border-dashed">
            <p class="text-sm text-muted-foreground italic">Nenhum vídeo gerado ainda.</p>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  </section>
</main>
