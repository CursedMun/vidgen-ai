<script lang="ts">
import { Badge } from "$lib/components/ui/badge";
import { Button } from "$lib/components/ui/button";
import * as Card from "$lib/components/ui/card";
import * as Command from "$lib/components/ui/command";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import * as Popover from "$lib/components/ui/popover";
import * as Table from "$lib/components/ui/table";
import { createTrpcClient } from "$lib/trpc/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/utils";
import {
  IconBrandInstagram,
  IconBrandYoutube,
  IconCheck,
  IconClock,
  IconLoader2,
  IconPlayerPlay,
  IconSelector,
  IconX,
} from "@tabler/icons-svelte";

const trpc = createTrpcClient();

let presets = $state([] as Awaited<ReturnType<typeof trpc.presets.list.query>>);
let savedCrons = $state<any[]>([]);
let allAccounts = $state<any[]>([]);

let generatedImages = $state<
	{ id: string; url: string; name: string; relativePath: string }[]
>([]);
let generatedVideos = $state<
	{ id: string; url: string; name: string; relativePath: string }[]
>([]);
let hoveredVideoId = $state<string | null>(null);
let open = $state(false);
let selectedAccounts = $state<any[]>([]);
const selectedLabels = $derived(
	selectedAccounts.map((a) => a.name).join(", ") || "Selecionar contas...",
);

function toggleAccount(account: any) {
	const exists = selectedAccounts.some((a) => a.id === account.id);
	if (exists) {
		selectedAccounts = selectedAccounts.filter((a) => a.id !== account.id);
	} else {
		const platform = account.instagramBusinessId ? "instagram" : "youtube";

		const accountWithPlatform = {
			...account,
			displayType: platform,
		};

		selectedAccounts = [...selectedAccounts, accountWithPlatform];
	}
}

const getStatusColor = (status: string) => {
	switch (status) {
		case "completed":
			return "bg-green-500/10 text-green-500 border-green-500/20";
		case "failed":
			return "bg-red-500/10 text-red-500 border-red-500/20";
		case "processing":
			return "bg-blue-500/10 text-blue-500 border-blue-500/20";
		default:
			return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
	}
};

let platforms = $state({ instagram: false, youtube: false });
let interval = $state("6h");
let mediaType = $state("Video");
let aiModel = $state("veo");
let sourceUrl = $state("");
let presetValue = $state("");

const load = async () => {
	generatedVideos = await trpc.videos.list.query();
	generatedImages = await trpc.videos.listImages.query();
	const instaAcconts = await trpc.videos.listInstagramAccounts.query();
	const youtubeAcconts = await trpc.videos.listYoutubeAccounts.query();
	allAccounts = [...instaAcconts, ...youtubeAcconts];
	presets = await trpc.presets.list.query();
	savedCrons = await trpc.presets.listCrons.query();
};

$effect(() => {
	load();
});

const triggerInterval = $derived(
	interval === "1h"
		? "Cada 1 hora"
		: interval === "6h"
			? "Cada 6 horas"
			: interval === "12h"
				? "Cada 12 horas"
				: "Diário",
);

async function addAutomation() {
	console.log("presetValue: ", presetValue);
	if (!presetValue) {
		alert("Por favor, seleciona um preset.");
		return;
	}
	console.log(
		"AQUIII",
		presetValue,
		platforms,
		sourceUrl,
		interval,
		mediaType,
		aiModel,
	);
	try {
		await trpc.publication.createCron.mutate({
			presetId: Number(presetValue),
			selectedAccounts,
			sourceUrl,
			interval,
			mediaType,
			aiModel,
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
          <!-- <div class="space-y-2">
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
        </div> -->

        <div class="space-y-2">
          <Label>Contas de Destino</Label>
          
          <Popover.Root bind:open>
            <Popover.Trigger>
              {#snippet child({ props })}
                <Button
                  {...props}
                  variant="outline"
                  role="combobox"
                  type="button"
                  class="w-full justify-between"
                >
                  <span class="truncate">{selectedLabels}</span>
                  <IconSelector class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              {/snippet}
            </Popover.Trigger>
        
            <Popover.Content class="w-[300px] p-0" side="bottom" align="start">
              <Command.Root>
                <Command.List>
                    <Command.Empty>Nenhuma conta encontrada.</Command.Empty>
                    <Command.Group>
                      {#each allAccounts as account (account.id)}
                        {@const isInstagram = !!account.instagramBusinessId}
                        <Command.Item
                          value={account.name}
                          onSelect={() => toggleAccount(account)}
                          class="flex items-center gap-2 cursor-pointer"
                        >
                          <div class="flex h-4 w-4 items-center justify-center">
                            {#if selectedAccounts.some(a => a.id === account.id)}
                              <IconCheck class="h-4 w-4 text-primary" />
                            {/if}
                          </div>
                    
                          {#if isInstagram}
                            <IconBrandInstagram class="h-4 w-4 text-pink-500" />
                          {:else}
                            <IconBrandYoutube class="h-4 w-4 text-red-500" />
                          {/if}
                    
                          <span class="flex-1 truncate">{account.name}</span>
                          <span class="text-[10px] uppercase opacity-50">
                            {isInstagram ? 'Insta' : 'YT'}
                          </span>
                        </Command.Item>
                      {/each}
                    </Command.Group>
                </Command.List>
              </Command.Root>
            </Popover.Content>
          </Popover.Root>
        </div>
        
        <div class="space-y-2">
          <Label>Fonte de Conteúdo (RSS ou Canal YT)</Label>
          <Input bind:value={sourceUrl} placeholder="https://..." class="w-full" />
        </div>
  
        <div class="grid-cols-1 md:grid-cols-3">
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
          <div class="grid-cols-1 md:grid-cols-3">
            <Label>Tipo</Label>
            <Select type="single" bind:value={mediaType}>
              <SelectTrigger class="w-full">{mediaType}</SelectTrigger>
              <SelectContent>
                <SelectItem value="Video">Vídeo</SelectItem>
                <SelectItem value="Image">Image</SelectItem>
              </SelectContent>
            </Select>
          </div>
  
          <div class="grid-cols-1 md:grid-cols-3">
            <Label>Modelo</Label>
            <Select type="single" bind:value={aiModel}>
              <SelectTrigger class="w-full">{aiModel}</SelectTrigger>
              <SelectContent>
                <SelectItem value="chatgpt">ChatGPT</SelectItem>
                <SelectItem value="veo">Google Veo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        <div >
        <Button variant="default" class="w-full bg-green-600 hover:bg-green-700 mt-4" onclick={() => addAutomation()}>
          Ativar
        </Button>
        </div>
      </Card.Content>
    </Card.Root>
  </section>
  <section class="mt-10 space-y-4">
    <div class="flex items-center justify-between">
      <Card.Title>Active Automation</Card.Title>
      <Badge variant="outline">{savedCrons.length} Crons</Badge>
    </div>
  
    <div class="rounded-md border bg-card">
      <Table.Root class="text-zinc-800">
        <Table.Header>
          <Table.Row>
            <Table.Head>Automação</Table.Head>
            <Table.Head>Preset</Table.Head>
            <Table.Head>Intervalo</Table.Head>
            <Table.Head>Status</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each savedCrons as cron (cron.id)}
            <Table.Row>
              <Table.Cell class="font-medium">
                <div class="flex flex-col">
                  <span class="truncate max-w-[300px]">{cron.title}</span>
                  <span class="text-[10px] text-muted-foreground">ID: #{cron.id}</span>
                </div>
              </Table.Cell>
              <Table.Cell>{cron.presetName || 'N/A'}</Table.Cell>
              <Table.Cell>
                <div class="flex items-center gap-1 text-xs">
                  <IconClock size={14} />
                  {cron.interval}
                </div>
              </Table.Cell>
              <Table.Cell>
                <Badge class={cn("capitalize font-normal", getStatusColor(cron.status))}>
                  {#if cron.status === 'processing'}
                    <IconLoader2 size={12} class="mr-1 animate-spin" />
                  {:else if cron.status === 'completed'}
                    <IconCheck size={12} class="mr-1" />
                  {:else if cron.status === 'failed'}
                    <IconX size={12} class="mr-1" />
                  {/if}
                  {cron.status}
                </Badge>
              </Table.Cell>
            </Table.Row>
          {:else}
            <Table.Row>
              <Table.Cell colspan={5} class="h-24 text-center text-muted-foreground">
                Nenhuma automação configurada.
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  </section>
  <section class="mt-10 space-y-6">
      <div class="flex items-center justify-between px-2">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-zinc-900">Generated Images</h2>
          <p class="text-sm text-zinc-500">Vídeos gerados pela IA prontos para publicação.</p>
        </div>
        <Badge variant="secondary" class="bg-zinc-100 text-zinc-700 border-none px-3 py-1">
          {generatedImages.length} Imagens
        </Badge>
      </div>
      <div>
        {#if generatedImages.length}
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1">
            {#each generatedImages as img}
              <div class="group relative aspect-square overflow-hidden rounded-xl border bg-muted shadow-sm transition-all hover:ring-2">
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
        </div>
  </section>
  <!-- <section class="mt-6">
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
  </section> -->

  <section class="mt-10 space-y-6">
    <div class="flex items-center justify-between px-2">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-zinc-900">Galeria de Criações</h2>
        <p class="text-sm text-zinc-500">Vídeos gerados pela IA prontos para publicação.</p>
      </div>
      <Badge variant="secondary" class="bg-zinc-100 text-zinc-700 border-none px-3 py-1">
        {generatedVideos.length} Gerados
      </Badge>
    </div>
    <div>
    {#if generatedVideos.length}
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1">
        {#each generatedVideos as video (video.url)}
          <div 
            class="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-zinc-900 shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-1"
            onmouseenter={() => hoveredVideoId = video.url}
            onmouseleave={() => hoveredVideoId = null}
          >
            <video 
              src={video.url} 
              autoplay 
              muted 
              loop 
              playsinline
              class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            >
              <track kind="captions" />
            </video>
  
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div class="absolute bottom-0 left-0 right-0 p-4">
                <p class="mb-3 text-sm font-medium text-white line-clamp-2">{video.name}</p>
                
                <div class="flex items-center gap-2">
                  <button class="flex-1 flex items-center justify-center gap-2 rounded-lg bg-white py-2 text-xs font-bold text-black hover:bg-zinc-200 transition-colors">
                    <IconPlayerPlay size={14} fill="currentColor" />
                    Automation
                  </button>
                  <!-- <button class="flex items-center justify-center rounded-lg bg-zinc-800/80 p-2 text-white hover:bg-zinc-700 transition-colors">
                    <IconDownload size={16} />
                  </button> -->
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="flex h-64 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 bg-zinc-50/50">
        <p class="text-sm text-zinc-400">No videos yet.</p>
      </div>
      {/if}
    </div>
  </section>
</main>
