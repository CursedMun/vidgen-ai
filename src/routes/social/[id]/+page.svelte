<script lang="ts">
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { createTrpcClient } from "$lib/trpc/client";
  import { Badge } from "@/components/ui/badge";
  import {
    ArrowLeft,
    Eye, Clock, Timer, UserPlus, Heart, MessageCircle, Users, Image as ImageIcon, Clapperboard, ThumbsUp
  } from "lucide-svelte";

  const trpc = createTrpcClient();
  
  const socialId = Number($page.params.id);
  
  let platform = $state<string>("instagram");
  let maxViews = $state<number>(0);
  let insightsData = $state<{platform: string, data: any[]}[]>([]);
  let metrics = $state<{label: string, value: string, unit: string, icon: string, color: string, bg: string}[]>([]);
  let mediasData = $state<any[]>([]);

  
  const load = async () => {
    try {
      const data = await trpc.accounts.accountInsights.mutate({ id: socialId });
      platform = data.platform
      insightsData = data.data;
      mediasData = await trpc.accounts.mediasInsights.mutate({ id: socialId, platform: data.platform });

      if (data.platform === "youtube") {
        maxViews = Math.max(...insightsData.chartData.map(d => d.views), 1);
        metrics = [
          { label: "Views", value: insightsData.totals.views, unit: "", icon: Eye, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Watch Time", value: insightsData.totals.watchTime, unit: "min", icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Retenção", value: insightsData.totals.avgDuration, unit: "s", icon: Timer, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Subscritores", value: insightsData.totals.subs, unit: "", icon: UserPlus, color: "text-red-600", bg: "bg-red-50" }
        ];
      }
    } catch (e) {
      console.error(e);
    }
  };
  
  $effect(() => {
    load();
  });

  const getValue = (insights: {"name": string, "period":string, "values":Record<string, number>[]}[], name: string) => {
    return insights?.find(i => i.name === name)?.values[0]?.value ?? 0;
  };

</script>

<main class="container mx-auto flex flex-col gap-6">
  <section>
    <div class="mb-10">
      <Button href="/social" variant="ghost" size="sm" class="mb-4">
        <ArrowLeft size={16} class="mr-2" />
        Back to Accounts
      </Button>

    <!-- Views Chart -->
    {#if platform === "instagram"}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 px-2 mb-10">
        {#each insightsData as item (item.id)}
          <Card.Root class="border-0 rounded-3xl shadow-lg transition-all hover:shadow-xl">
            <Card.Header>
              <Card.Title class="text-lg">{item.title}</Card.Title>
              <Card.Description class="h-20 line-clamp-5 text-xs">
                {item.description}
              </Card.Description>
            </Card.Header>
            
            <Card.Content>
              <!-- <div class="h-[150px] flex items-end gap-1 bg-zinc-50/50 rounded-2xl p-4 mb-4">
                <div class="w-full text-center text-[10px] text-zinc-400 italic">
                  Gráfico {item.name}
                </div>
              </div>
      -->
              <div class="flex flex-col items-center justify-center">
                <span class="text-3xl font-bold tracking-tighter text-zinc-900">
                  {item.total_value.value.toLocaleString()}
                </span>
                <span class="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mt-1">
                  Total {item.name.replace('_', ' ')}
                </span>
              </div>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>
      {:else}
      <div class="w-full p-6 space-y-8">
        <div class="flex items-center justify-between px-4 pt-2">
          <div>
            <h2 class="text-3xl font-black tracking-tight text-zinc-900">Canal Analytics</h2>
            <p class="text-sm font-medium text-zinc-500 uppercase tracking-widest">Performance · Últimos 28 Dias</p>
          </div>
        </div>
      
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {#each metrics as metric}
            <Card.Root class="border-0 rounded-[2rem] shadow-sm bg-white hover:shadow-md transition-shadow">
              <Card.Content class="p-6">
                <div class="flex items-center justify-between mb-6">
                  <div class={`p-3 rounded-2xl ${metric.bg}`}>
                    <svelte:component this={metric.icon} size={22} class={metric.color} />
                  </div>
                </div>
                <div class="space-y-1">
                  <div class="flex items-baseline gap-1">
                    <span class="text-4xl font-black tracking-tighter text-zinc-900">
                      {metric.value.toLocaleString()}
                    </span>
                    {#if metric.unit}
                      <span class="text-sm font-bold text-zinc-400 uppercase">{metric.unit}</span>
                    {/if}
                  </div>
                  <p class="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Total {metric.label}</p>
                </div>
              </Card.Content>
            </Card.Root>
          {/each}
        </div>
      
        <Card.Root class="border-0 rounded-[2.5rem] shadow-sm bg-white overflow-hidden">
          <Card.Header class="px-8 pt-8 pb-0">
            <Card.Title class="text-xs font-black text-zinc-400 uppercase tracking-[0.3em]">Visualizações Diárias</Card.Title>
          </Card.Header>
          <Card.Content class="p-8">
            <div class="h-48 flex items-end gap-1 sm:gap-2">
              {#each insightsData.chartData as day}
                <div 
                  class="flex-1 bg-blue-500/10 hover:bg-blue-600 rounded-t-lg transition-all duration-500 relative group"
                  style="height: {(day.views / maxViews * 100) || 1}%"
                >
                  <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-20 shadow-xl">
                    <span class="font-bold">{day.views} views</span> <span class="opacity-60 ml-1">({day.date})</span>
                    <div class="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 rotate-45"></div>
                  </div>
                </div>
              {/each}
            </div>
            
            <div class="flex justify-between mt-4 px-2">
              <span class="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">{insightsData.chartData[0].date}</span>
              <span class="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">{insightsData.chartData[insightsData.chartData.length - 1].date}</span>
            </div>
          </Card.Content>
        </Card.Root>
      </div>
      {/if}
    
    <div>
      <h2 class="text-2xl font-bold mb-4">Generated Medias</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {#each mediasData as media (media.id)}
          <Card.Root class="border-0 rounded-3xl shadow-lg overflow-hidden flex flex-col group h-full bg-card">
            
            <div class="aspect-video bg-muted relative overflow-hidden rounded-t-3xl">
              {#if platform === "youtube"}
                <img src={media.thumbnail} alt="Youtube Post" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              {:else}
                {#if media.media_type === "IMAGE"}
                  <img src={media.media_url} alt="Instagram Post" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <Badge class="absolute top-3 left-3 bg-black/50 backdrop-blur-md border-0">
                    <ImageIcon size={12} class="mr-1" /> Image
                  </Badge>
                {:else}
                  <div class="relative w-full h-full">
                    <video preload="metadata" class="w-full h-full object-cover">
                      <source src={media.media_url} type="video/mp4" />
                    </video>
                    <div class="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                      <Badge class="absolute top-3 left-3 bg-primary border-0 shadow-lg">
                        <Clapperboard size={12} class="mr-1" /> Reel
                      </Badge>
                    </div>
                  </div>
                {/if}
              {/if}
            </div>

            <Card.Content class="mt-auto">
              <div class="grid grid-cols-2 gap-4">
                
                <div class="flex items-center gap-2 bg-zinc-50 p-2 rounded-2xl">
                  <div class="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                    <Eye size={16} />
                  </div>
                  <div class="flex flex-col">
                    <span class="text-xs text-muted-foreground">Views</span>
                    <span class="font-bold text-sm">{platform === "youtube" ? media.views : getValue(media.insight, 'views').toLocaleString()}</span>
                  </div>
                </div>
                {#if platform === "instagram"}
                <div class="flex items-center gap-2 bg-zinc-50 p-2 rounded-2xl">
                  <div class="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                    <Users size={16} />
                  </div>
                  <div class="flex flex-col">
                    <span class="text-xs text-muted-foreground">Reach</span>
                    <span class="font-bold text-sm">{getValue(media.insight, 'reach').toLocaleString()}</span>
                  </div>
                </div>
                {/if}
                <div class="flex items-center gap-2 bg-zinc-50 p-2 rounded-2xl">
                  <div class="p-1.5 bg-red-100 text-red-600 rounded-lg">
                    <Heart size={16} />
                  </div>
                  <div class="flex flex-col">
                    <span class="text-xs text-muted-foreground">Likes</span>
                    <span class="font-bold text-sm">{platform === "youtube" ? media.likes : getValue(media.insight, 'likes').toLocaleString()}</span>
                  </div>
                </div>

                <div class="flex items-center gap-2 bg-zinc-50 p-2 rounded-2xl">
                  <div class="p-1.5 bg-green-100 text-green-600 rounded-lg">
                    <MessageCircle size={16} />
                  </div>
                  <div class="flex flex-col">
                    <span class="text-xs text-muted-foreground">Comments</span>
                    <span class="font-bold text-sm">{platform === "youtube" ? media.comments : getValue(media.insight, 'comments').toLocaleString()}</span>
                  </div>
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
