<script lang="ts">
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { createTrpcClient } from "$lib/trpc/client";
  import { Badge } from "@/components/ui/badge";
  import {
    ArrowLeft,
    Eye, Heart, MessageCircle, Users, Image as ImageIcon, Clapperboard
  } from "lucide-svelte";

  const trpc = createTrpcClient();
  
  const socialId = Number($page.params.id);
  
  let insightsData = $state<any[]>([]);
  let mediasData = $state<any[]>([]);

  
  const load = async () => {
    try {
      insightsData = await trpc.accounts.accountInsights.mutate({ id: socialId });
      mediasData = await trpc.accounts.accountMedias.mutate({ id: socialId });
      console.log('mediasData: ', JSON.stringify(mediasData));
    } catch (e) {
      console.error(e);
    }
  };
  
  $effect(() => {
    load();
  });

  const getStat = (insights: {"name": string, "period":string, "values":Record<string, number>[]}[], name: string) => {
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
    <div>
      <h2 class="text-2xl font-bold mb-4">Generated Medias</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {#each mediasData as media (media.id)}
          <Card.Root class="border-0 rounded-3xl shadow-lg overflow-hidden flex flex-col group h-full bg-card">
            
            <div class="aspect-video bg-muted relative overflow-hidden rounded-t-3xl">
              {#if media.media_type === "IMAGE"}
                <img src={media.media_url} alt="Instagram Post" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <Badge class="absolute top-3 left-3 bg-black/50 backdrop-blur-md border-0">
                  <ImageIcon size={12} class="mr-1" /> Imagem
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
            </div>

            <Card.Content class="mt-auto">
              <div class="grid grid-cols-2 gap-4">
                
                <div class="flex items-center gap-2 bg-zinc-50 p-2 rounded-2xl">
                  <div class="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                    <Eye size={16} />
                  </div>
                  <div class="flex flex-col">
                    <span class="text-xs text-muted-foreground">Views</span>
                    <span class="font-bold text-sm">{getStat(media.insight, 'views').toLocaleString()}</span>
                  </div>
                </div>

                <div class="flex items-center gap-2 bg-zinc-50 p-2 rounded-2xl">
                  <div class="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                    <Users size={16} />
                  </div>
                  <div class="flex flex-col">
                    <span class="text-xs text-muted-foreground">Reach</span>
                    <span class="font-bold text-sm">{getStat(media.insight, 'reach').toLocaleString()}</span>
                  </div>
                </div>

                <div class="flex items-center gap-2 bg-zinc-50 p-2 rounded-2xl">
                  <div class="p-1.5 bg-red-100 text-red-600 rounded-lg">
                    <Heart size={16} />
                  </div>
                  <div class="flex flex-col">
                    <span class="text-xs text-muted-foreground">Likes</span>
                    <span class="font-bold text-sm">{getStat(media.insight, 'likes').toLocaleString()}</span>
                  </div>
                </div>

                <div class="flex items-center gap-2 bg-zinc-50 p-2 rounded-2xl">
                  <div class="p-1.5 bg-green-100 text-green-600 rounded-lg">
                    <MessageCircle size={16} />
                  </div>
                  <div class="flex flex-col">
                    <span class="text-xs text-muted-foreground">Comments</span>
                    <span class="font-bold text-sm">{getStat(media.insight, 'comments').toLocaleString()}</span>
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
