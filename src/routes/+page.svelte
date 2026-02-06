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

  let generatedImages = $state<{ id: string; url: string; name: string; relativePath: string }[]>([]);
  let generatedVideos = $state<{ id: string; url: string; name: string; relativePath: string }[]>([]);
  let isGeneratingVideoId = $state<number | null>(null);
  let isPublishing = $state<string | null>(null);
  let selectedAccountId = $state<number | null>(null);
  let accounts = $state<{ id: number; name: string; expiresAt: string; updatedAt: string | null; instagramBusinessId: string; accessToken: string; }[]>([]);
  let newToken = $state("");
  let accountAlias = $state("");
  // url cloudflare
  let publicBaseUrl = "https://bold-thu-reserve-stars.trycloudflare.com"; 

  async function addAccount() {
    await trpc.videos.addInstagramAccount.mutate({ 
      shortLivedToken: newToken, 
      name: accountAlias 
    });
    newToken = ""; accountAlias = "";
    accounts = await trpc.videos.listInstagramAccounts.query();
  }

  const load = async () => {
    transcriptions = await trpc.transcriber.list.query();
    channels = await trpc.channels.list.query();
    generatedVideos = await trpc.videos.list.query();
    generatedImages = await trpc.videos.listImages.query();
    accounts = await trpc.videos.listInstagramAccounts.query();
  };

  async function publishVideo(video: any, platform: 'instagram' | 'x' | 'tiktok', accountId?: number) {
  const idKey = `${video.id}-${platform}`;
  isPublishing = idKey;
  
  try {
    const result = await trpc.videos.publish.mutate({
      filename: video.name,
      platform,
      caption: "Teste direto do Dashboard! ⚽️",
      publicBaseUrl,
      type: "video",
      accountId
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

async function publishImage(image: any, platform: 'instagram' | 'x' | 'tiktok', accountId?: number) {
  const idKey = `${image.id}-${platform}`;
  isPublishing = idKey;
  
  try {
    const result = await trpc.videos.publish.mutate({
      filename: image.name,
      platform,
      caption: "Teste direto do Dashboard! ⚽️",
      publicBaseUrl,
      type: "image",
      accountId
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

  async function generateMidia(id: number, text: string | null) {
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
                    class="bg-black"
                    disabled={isGeneratingVideoId === item.id}
                    onclick={() => generateMidia(item.id, item.transcript)}
                  >
                    {isGeneratingVideoId === item.id ? 'Generating...' : 'Generate Video'}
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


  <section class="w-full flex gap-6 mb-6 border border-none">  
    <div class="flex-1 min-w-[380px]">
      <Card.Root class="h-full shadow-sm">
        <div class="p-6">
          <div class="mb-4">
            <h3 class="text-lg font-bold text-gray-800">Novo Perfil</h3>
            <p class="text-xs text-muted-foreground">Vincule uma nova conta do Instagram</p>
          </div>
          
          <div class="grid gap-4">
            <div class="space-y-1.5">
              <label class="text-[10px] font-bold uppercase text-gray-400 ml-1">Identificação</label>
              <input bind:value={accountAlias} placeholder="Nome do Perfil" class="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
            
            <div class="space-y-1.5">
              <label class="text-[10px] font-bold uppercase text-gray-400 ml-1">Meta Token</label>
              <input bind:value={newToken} placeholder="Short-Lived Token" class="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>

            <Button class="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-5" onclick={addAccount}>
              Vincular Conta
            </Button>
          </div>
        </div>
      </Card.Root>
    </div>

    <div class="flex-1 min-w-[380px]">
      <Card.Root class="h-full shadow-sm">
        <div class="p-6">
          <div class="mb-6">
            <h2 class="text-lg font-bold text-gray-800">Destino da Publicação</h2>
            <p class="text-sm text-gray-500">Onde a mídia será publicada automaticamente</p>
          </div>
  
          <div class="space-y-6">
            <div class="space-y-2">
              <label class="block text-xs font-semibold text-gray-400 uppercase ml-1">
                Perfil Ativo
              </label>
              <select 
                bind:value={selectedAccountId}
                class="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none text-sm font-medium cursor-pointer"
              >
                <option value={null}>— Selecionar Perfil —</option>
                {#each accounts as acc}
                  <option value={acc.id}>{acc.name} (ID: {acc.instagramBusinessId})</option>
                {/each}
              </select>
            </div>
  
            {#if selectedAccountId}
              {@const selected = accounts.find(a => a.id === selectedAccountId)}
              <div class="px-4 py-4 bg-green-50 text-green-700 rounded-2xl border border-green-100 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                        <p class="text-xs uppercase font-bold opacity-70">Perfil Selecionado</p>
                        <p class="text-sm font-bold leading-none">{selected?.name}</p>
                    </div>
                </div>
                <Badge variant="outline" class="bg-white border-green-200 text-green-700">Online</Badge>
              </div>
            {/if}
          </div>
        </div>
      </Card.Root>
    </div>
</section>
  
  <section class="mt-10">
    <Card.Root>
      <Card.Header>
        <div class="flex items-center justify-between">
          <div class="space-y-1.5">
            <Card.Description>Visual Assets</Card.Description>
            <Card.Title>Generated Images</Card.Title>
          </div>
          <Badge variant="secondary">{generatedImages.length} Imagens</Badge>
        </div>
      </Card.Header>
      <Card.Content>
        {#if generatedImages.length}
          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {#each generatedImages as img}
              <div class="group relative aspect-square overflow-hidden rounded-xl border bg-muted shadow-sm transition-all hover:ring-2 hover:ring-blue-500">
                <img 
                  src={img.url} 
                  alt={img.name} 
                  class="h-full w-full object-cover transition-transform group-hover:scale-105" 
                />
                
                <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    class="h-8 text-xs w-24"
                    disabled={!selectedAccountId}
                    onclick={() => publishImage(img, 'instagram', selectedAccountId)} 
                  >
                    Postar IG
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    class="h-8 text-xs w-24 bg-white/10 text-white"
                    onclick={() => publishImage(img, 'x')}
                  >
                    Postar X
                  </Button>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="flex h-32 items-center justify-center rounded-lg border border-dashed">
            <p class="text-sm text-muted-foreground">Nenhuma imagem gerada ainda.</p>
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
                    disabled={!selectedAccountId || isPublishing === `${video.id}-instagram`}
                    onclick={() => publishVideo(video, 'instagram', selectedAccountId)}
                  >
                    {isPublishing === `${video.id}-instagram` ? 'Sending...' : '📸 Instagram Reels'}
                  </Button>

                  <Button 
                    size="sm" 
                    variant="outline"
                    class="w-full hover:bg-black hover:text-white"
                    disabled={isPublishing === `${video.id}-tiktok`}
                    onclick={() => publishVideo(video, 'tiktok')}
                  >
                    {isPublishing === `${video.id}-tiktok` ? 'Sending...' : '🎵 TikTok'}
                  </Button>

                  <Button 
                    size="sm" 
                    variant="outline"
                    class="w-full hover:bg-sky-500 hover:text-white"
                    disabled={isPublishing === `${video.id}-x`}
                    onclick={() => publishVideo(video, 'x')}
                  >
                    {isPublishing === `${video.id}-x` ? 'Sending...' : '🐦 X (Twitter)'}
                  </Button>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="flex h-32 items-center justify-center rounded-lg border border-dashed">
            <p class="text-sm text-muted-foreground italic">No videos yet.</p>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  </section>
</main>
