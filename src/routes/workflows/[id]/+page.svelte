<script lang="ts">
  import { page } from "$app/stores";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { createTrpcClient } from "$lib/trpc/client";
  import { cn } from "@/utils";
  import {
    ArrowLeft,
    Check,
    Clock,
    Eye,
    Heart,
    Loader2,
    MessageCircle,
    Play,
    X
  } from "lucide-svelte";

  const trpc = createTrpcClient();
  
  const cronId = Number($page.params.id);
  
  let cronData = $state<any>(null);
  let videos = $state<any[]>([]);
  let chartData = $state<any[]>([]);
  
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
  
  const load = async () => {
    try {
      const crons = await trpc.presets.listCrons.query();
      cronData = crons.find(c => c.id === cronId);
      
      // TODO: Load videos from cronExecutions
      // videos = await trpc.publication.getCronVideos.query({ cronId });
      
      // Mock data for now
      videos = [
        {
          id: 1,
          title: "Sample Video 1",
          status: "completed",
          createdAt: new Date().toISOString(),
          views: 1250,
          likes: 89,
          comments: 23,
          thumbnail: ""
        },
        {
          id: 2,
          title: "Sample Video 2",
          status: "processing",
          createdAt: new Date().toISOString(),
          views: 850,
          likes: 45,
          comments: 12,
          thumbnail: ""
        }
      ];
      
      // Mock chart data
      chartData = [
        { date: "2024-01-01", views: 120 },
        { date: "2024-01-02", views: 250 },
        { date: "2024-01-03", views: 380 },
        { date: "2024-01-04", views: 520 },
        { date: "2024-01-05", views: 680 },
        { date: "2024-01-06", views: 890 },
        { date: "2024-01-07", views: 1250 }
      ];
    } catch (e) {
      console.error(e);
    }
  };
  
  $effect(() => {
    load();
  });
</script>

<main class="container mx-auto flex flex-col gap-6">
  <section>
    <div class="mb-6">
      <Button href="/automation" variant="ghost" size="sm" class="mb-4">
        <ArrowLeft size={16} class="mr-2" />
        Back to Automations
      </Button>
      
      {#if cronData}
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h1 class="text-3xl font-bold tracking-tight text-foreground">{cronData.title}</h1>
            <p class="text-muted-foreground">Automation #{cronData.id}</p>
            {#if cronData.description}
              <p class="text-sm text-muted-foreground mt-2">{cronData.description}</p>
            {/if}
          </div>
          <Badge class={cn("capitalize font-normal items-center", getStatusColor(cronData.status ?? ""))}>
            {#if cronData.status === 'processing'}
              <Loader2 size={12} class="mr-1 animate-spin" />
            {:else if cronData.status === 'completed'}
              <Check size={12} class="mr-1" />
            {:else if cronData.status === 'failed'}
              <X size={12} class="mr-1" />
            {/if}
            {cronData.status}
          </Badge>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <Card.Root class="border-0 rounded-3xl shadow-lg">
            <Card.Content class="pt-6">
              <div class="text-sm text-muted-foreground">Preset</div>
              <div class="text-lg font-semibold">{cronData.presetName || 'N/A'}</div>
            </Card.Content>
          </Card.Root>
          
          <Card.Root class="border-0 rounded-3xl shadow-lg">
            <Card.Content class="pt-6">
              <div class="text-sm text-muted-foreground">Type</div>
              <div class="text-lg font-semibold capitalize">{cronData.mediaType || 'video'}</div>
            </Card.Content>
          </Card.Root>
          
          <Card.Root class="border-0 rounded-3xl shadow-lg">
            <Card.Content class="pt-6">
              <div class="text-sm text-muted-foreground">Model</div>
              <div class="text-lg font-semibold uppercase">{cronData.aiModel || 'veo'}</div>
            </Card.Content>
          </Card.Root>
          
          <Card.Root class="border-0 rounded-3xl shadow-lg">
            <Card.Content class="pt-6">
              <div class="text-sm text-muted-foreground flex items-center gap-1">
                <Clock size={14} />
                Interval
              </div>
              <div class="text-xs font-mono mt-1">{cronData.interval}</div>
            </Card.Content>
          </Card.Root>
        </div>
      {/if}
    </div>

    <!-- Views Chart -->
    <Card.Root class="border-0 rounded-3xl shadow-lg mb-6">
      <Card.Header>
        <Card.Title>Views Over Time</Card.Title>
        <Card.Description>Total views from all videos in this automation</Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="h-[300px] flex items-end gap-2">
          {#each chartData as point}
            <div class="flex-1 flex flex-col items-center gap-2">
              <div 
                class="w-full bg-primary rounded-t-lg transition-all hover:bg-primary/80" 
                style="height: {(point.views / 1250) * 100}%"
              ></div>
              <div class="text-xs text-muted-foreground">{new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            </div>
          {/each}
        </div>
        <div class="mt-4 text-center">
          <span class="text-2xl font-bold">{chartData.reduce((acc, p) => acc + p.views, 0).toLocaleString()}</span>
          <span class="text-sm text-muted-foreground ml-2">Total Views</span>
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Videos Grid -->
    <div>
      <h2 class="text-2xl font-bold mb-4">Generated Videos</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each videos as video (video.id)}
          <Card.Root class="border-0 rounded-3xl shadow-lg overflow-hidden">
            <div class="aspect-video bg-muted relative">
              {#if video.thumbnail}
                <img src={video.thumbnail} alt={video.title} class="w-full h-full object-cover" />
              {:else}
                <div class="w-full h-full flex items-center justify-center">
                  <Play size={48} class="text-muted-foreground" />
                </div>
              {/if}
              <Badge class={cn("absolute top-2 right-2 capitalize font-normal items-center", getStatusColor(video.status))}>
                {#if video.status === 'processing'}
                  <Loader2 size={12} class="mr-1 animate-spin" />
                {:else if video.status === 'completed'}
                  <Check size={12} class="mr-1" />
                {:else if video.status === 'failed'}
                  <X size={12} class="mr-1" />
                {/if}
                {video.status}
              </Badge>
            </div>
            <Card.Header class="pb-3">
              <Card.Title class="text-base line-clamp-2">{video.title}</Card.Title>
              <Card.Description class="text-xs">
                {new Date(video.createdAt).toLocaleDateString()}
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-1">
                  <Eye size={14} class="text-muted-foreground" />
                  <span class="font-medium">{video.views.toLocaleString()}</span>
                </div>
                <div class="flex items-center gap-1">
                  <Heart size={14} class="text-muted-foreground" />
                  <span class="font-medium">{video.likes}</span>
                </div>
                <div class="flex items-center gap-1">
                  <MessageCircle size={14} class="text-muted-foreground" />
                  <span class="font-medium">{video.comments}</span>
                </div>
              </div>
            </Card.Content>
          </Card.Root>
        {:else}
          <div class="col-span-full">
            <Card.Root class="border-2 border-dashed border-border bg-muted/50">
              <Card.Content class="flex flex-col items-center justify-center py-12">
                <p class="text-muted-foreground">No videos generated yet</p>
              </Card.Content>
            </Card.Root>
          </div>
        {/each}
      </div>
    </div>
  </section>
</main>
