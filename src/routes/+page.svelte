<script lang="ts">
  import ChannelsJobs from '$lib/components/channels-jobs.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { createTrpcClient } from '$lib/trpc/client';
  import { Checkbox } from '@/components/ui/checkbox';
  import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
  import { formatTimestamp, snippet } from '@/utils';
  const trpc = createTrpcClient();

  let presets = $state(
    [] as Awaited<ReturnType<typeof trpc.presets.list.query>>,
  );

  let selectedPlatform = $state<'instagram' | 'youtube' | 'x' | 'tiktok' | null>(null);
  let selectedAccountId = $state<number | null>(null);
  let generatedImages = $state<{ id: string; url: string; name: string; relativePath: string }[]>([]);
  let generatedVideos = $state<{ id: string; url: string; name: string; relativePath: string }[]>([]);
  let isGeneratingVideoId = $state<number | null>(null);
  let isPublishing = $state<string | null>(null);
  let accounts = $state<{ id: number; name: string; expiresAt: string; updatedAt: string | null; instagramBusinessId: string; accessToken: string; }[]>([]);


  let platforms = $state({ instagram: false, youtube: false });
  let interval = $state("6h");
  let mediaType = $state("Video");
  let aiModel = $state("veo");
  let sourceUrl = $state("");
  let presetValue = $state("");

  const load = async () => {
    generatedVideos = await trpc.videos.list.query();
    generatedImages = await trpc.videos.listImages.query();
    accounts = await trpc.videos.listInstagramAccounts.query();
    presets =  await trpc.presets.list.query();
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
      caption: "Teste direto do Dashboard!",
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

  async function generateMidia(id: number, text: string | null) {
    isGeneratingVideoId = id;
    try {
      await trpc.videos.generate.mutate({ transcriptionId: id, transcription: text || "" });
      generatedVideos = await trpc.videos.list.query();
      alert("Video successfully generated.");
    } catch (error) {
      alert(`Error:Error generating video.`);
    } finally {
      isGeneratingVideoId = null;
    }
  }
  

  // Track expanded transcripts
  let expandedTranscripts = $state<Record<number, boolean>>({});
  const toggleTranscript = (id: number) => {
    expandedTranscripts[id] = !expandedTranscripts[id]; // Trigger reactivity
  };

  let loadingVideoId = $state(false);
  const loadVideo = (id: number) => {
    loadingVideoId = !loadingVideoId;
  };


  const triggerInterval = $derived(
    interval === "1h" ? "Cada 1 hora" : 
    interval === "6h" ? "Cada 6 horas" : 
    interval === "12h" ? "Cada 12 horas" : "Diário"
  );

  async function addAutomation() {
    console.log('presetValue: ', presetValue);
    if (!presetValue) {
      alert("Por favor, seleciona um preset.");
      return;
    }
    console.log("AQUIII", presetValue,
        platforms,
        sourceUrl,
        interval,
        mediaType,
        aiModel)
    try {
      await trpc.publication.createCron.mutate({
        presetId: Number(presetValue),
        platforms,
        sourceUrl,
        interval,
        mediaType,
        aiModel
        
      });
      
      alert("Automação ativada com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao ativar automação.");
    }
  }

</script>

<main class="container mx-auto flex flex-col py-8 gap-6 overflow-hidden">
  <section class="mt-10">
    <Card.Root>
      <Card.Header>
        <Card.Description>Automation</Card.Description>
        <Card.Title>(Cron)</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-6">
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="space-y-2">
            <Label>Preset</Label>
            <Select type="single" name="presets" bind:value={presetValue}>
              <SelectTrigger class="w-full">
                Preset {presetValue}
              </SelectTrigger>
              <SelectContent>
                {#await presets then data}
                  {#each data ?? [] as p}
                    <SelectItem value={p.id.toString()}>{p.name}</SelectItem>
                  {/each}
                {/await}
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>Accounts</Label>
            <div class="flex gap-3">
            <div class="flex items-center gap-1">
              <Checkbox id="instagram" checked={platforms.instagram} onCheckedChange={(v) => platforms.instagram = !!v} />
              <Label for="instagram">Instagram</Label>
            </div>
            <div class="flex items-center gap-1">
              <Checkbox id="youtube" checked={platforms.youtube} onCheckedChange={(v) => platforms.youtube = !!v}/>
              <Label for="youtube">Youtube</Label>
            </div>
          </div>
          </div>
          <div class="space-y-2">
            <Label>RSS ou Canal YT</Label>
            <Input bind:value={sourceUrl} placeholder="URL do Feed ou Canal" class="w-full" />
          </div>
        </div>
  
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="space-y-2">
            <Label>Intervalo</Label>
            <Select type="single" bind:value={interval}>
              <SelectTrigger class="w-full">{triggerInterval}</SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Cada 1 hora</SelectItem>
                <SelectItem value="6h">Cada 6 horas</SelectItem>
                <SelectItem value="12h">Cada 12 horas</SelectItem>
                <SelectItem value="24h">Diário</SelectItem>
              </SelectContent>
            </Select>
          </div>
  
          <div class="space-y-2">
            <Label>Tipo</Label>
            <Select type="single" bind:value={mediaType}>
              <SelectTrigger class="w-full">{mediaType}</SelectTrigger>
              <SelectContent>
                <SelectItem value="Video">Vídeo</SelectItem>
                <SelectItem value="Image">Image</SelectItem>
              </SelectContent>
            </Select>
          </div>
  
          <div class="space-y-2">
            <Label>Modelo</Label>
            <Select type="single" bind:value={aiModel}>
              <SelectTrigger class="w-full">{aiModel}</SelectTrigger>
              <SelectContent>
                <SelectItem value="chatgpt">ChatGPT</SelectItem>
                <SelectItem value="veo">Google Veo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
  
        <Button variant="default" class="w-full bg-green-600 hover:bg-green-700 mt-4" onclick={() => addAutomation()}>
          Ativar
        </Button>
      </Card.Content>
    </Card.Root>
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
