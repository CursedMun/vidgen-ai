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

  let selectedPlatform = $state<'instagram' | 'youtube' | 'x' | 'tiktok' | null>(null);
  let selectedAccountId = $state<number | null>(null);
  let generatedImages = $state<{ id: string; url: string; name: string; relativePath: string }[]>([]);
  let generatedVideos = $state<{ id: string; url: string; name: string; relativePath: string }[]>([]);
  let isGeneratingVideoId = $state<number | null>(null);
  let isPublishing = $state<string | null>(null);
  let accounts = $state<{ id: number; name: string; expiresAt: string; updatedAt: string | null; instagramBusinessId: string; accessToken: string; }[]>([]);
  let newToken = $state("");
  let accountAlias = $state("");

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

  async function publishVideo(video: any, platform: 'instagram' | 'x' | 'tiktok' | 'youtube' | null) {
    console.log('selectedAccountId: ', selectedAccountId);
    console.log('platform: ', platform);
  if (!platform)  {
    return alert(`Error: Select platform`);
  }
  const idKey = `${video.id}-${platform}`;
  isPublishing = idKey;
  if (!selectedPlatform) return alert("Seleciona uma plataforma!");
  if (selectedPlatform === 'instagram' && !selectedAccountId) return alert("Seleciona a conta do Instagram!");
  try {
    const result = await trpc.videos.publish.mutate({
      filename: video.name,
      platform,
      caption: "Teste direto do Dashboard!",
      type: "video",
      accountId: selectedAccountId === null ? undefined : selectedAccountId
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

async function publishImage(image: any, platform: 'instagram' | 'x' | 'tiktok') {
  const idKey = `${image.id}-${platform}`;
  isPublishing = idKey;
  
  try {
    const result = await trpc.videos.publish.mutate({
      filename: image.name,
      platform,
      caption: "Teste direto do Dashboard! ⚽️",
      type: "image",
      accountId: selectedAccountId === null ? undefined : selectedAccountId
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

  async function connectTwitter() {
    selectedPlatform = 'x'; 
    selectedAccountId = null;
    const { redirectUrl } = await trpc.videos.authorizeX.query();
    if (redirectUrl) {
      window.open(redirectUrl.url, '_blank', 'noopener,noreferrer');
    }
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
  
          <div class="flex-1 space-y-4">
            <h2 class="text-lg font-bold text-gray-800">Destino da Publicação</h2>
            
            <div class="flex gap-4">
              <button 
                onclick={() => selectedPlatform = 'instagram'}
                class="flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 {selectedPlatform === 'instagram' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 bg-white'}"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mb-1"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                <span class="text-xs font-bold uppercase">Instagram</span>
              </button>
        
              <button 
                onclick={() => { selectedPlatform = 'youtube'; selectedAccountId = null; }}
                class="flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 {selectedPlatform === 'youtube' ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 bg-white'}"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mb-1"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
                <span class="text-xs font-bold uppercase">YouTube Shorts</span>
              </button>

              <button 
              onclick={connectTwitter}
              class="flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 {selectedPlatform === 'x' ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 bg-white'}"
            >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="2" 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              class="mb-1"
            >
              <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
              <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
            </svg>
              <span class="text-xs font-bold uppercase">Twitter / X</span>
            </button>


            </div>
        
            {#if selectedPlatform === 'instagram'}
              <div class="pt-4 border-t animate-in fade-in slide-in-from-top-2">
                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-2">Selecionar Conta Instagram</label>
                <select bind:value={selectedAccountId} class="w-full p-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-500">
                  <option value={null}>— Escolher Perfil —</option>
                  {#each accounts as acc}
                    <option value={acc.id}>{acc.name}</option>
                  {/each}
                </select>
              </div>
            {:else if selectedPlatform === 'youtube'}
              <div class="pt-4 border-t animate-in fade-in slide-in-from-top-2">
                <div class="flex items-center gap-3 p-3 bg-green-100/50 rounded-lg border border-green-200">
                  <div class="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                  <p class="text-xs font-medium text-green-800">YouTube Studio</p>
                </div>
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
                    onclick={() => publishImage(img, 'instagram')} 
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
                
                <Button
                  size="sm"
                  variant="default"
                  class={selectedPlatform === 'youtube' ? 'bg-red-600 hover:bg-red-700' : 'bg-black'}
                  disabled={!selectedPlatform || (selectedPlatform === 'instagram' && !selectedAccountId)}
                  onclick={() => publishVideo(video, selectedPlatform)}
                >
                  {#if !selectedPlatform}
                    Select Platform First
                  {:else}
                    Post to {selectedPlatform === 'youtube' ? 'Shorts' : 'Instagram'}
                  {/if}
                </Button>
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
