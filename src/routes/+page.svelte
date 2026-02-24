<script lang="ts">
import { createTrpcClient } from "$lib/trpc/client";
import { Play } from "lucide-svelte";

const trpc = createTrpcClient();

let generatedMedia = $state<
	{ id: string; url: string; type: string; createdAt: string; name: string; relativePath: string }[]
>([]);

let hoveredVideoId = $state<string | null>(null);

const load = async () => {
  generatedMedia = await trpc.videos.listMedia.query()
};

$effect(() => {
	load();
});

</script>

<main class="w-full h-full overflow-hidden">
  <section>
    <div>
      {#if generatedMedia.length}
        <div class="columns-2 gap-x-2 gap-y-2 md:columns-3 lg:columns-4 xl:columns-5">
          {#each generatedMedia as media (media.url)}
            <div 
              class="group rounded-sm relative break-inside-avoid overflow-hidden bg-card transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 mb-2"
              onmouseenter={() => hoveredVideoId = media.url}
              onmouseleave={() => hoveredVideoId = null}
            >
              {#if media.type === "video"}
                <div class="relative w-full">
                  <video 
                    src={media.url} 
                    autoplay 
                    muted 
                    loop 
                    playsinline
                    class="w-full h-auto block transition-transform duration-700 group-hover:scale-110"
                  >
                    <track kind="captions" />
                  </video>
                  <div class="absolute top-3 right-3 opacity-100 transition-opacity group-hover:opacity-0">
                    <div class="rounded-full bg-black/40 backdrop-blur-md p-1.5 text-white">
                       <Play size={12} fill="currentColor" />
                    </div>
                 </div>
                </div>
              {:else}
                <img 
                  src={media.url} 
                  alt={media.name} 
                  class="w-full h-auto block transition-transform group-hover:scale-105" 
                />
              {/if}
  
              <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col justify-end p-4">
                  <p class="mb-3 text-sm font-medium text-white line-clamp-2">{media.name}</p>
                  
                  <!-- <div class="flex items-center gap-2">
                    <button class="flex-1 flex items-center justify-center gap-2 rounded-lg bg-white py-2 text-xs font-bold text-black hover:bg-zinc-200 transition-colors">
                      <IconPlayerPlay size={14} fill="currentColor" />
                      Automation
                    </button>
                  </div> -->
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="flex h-64 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-muted/50">
          <p class="text-sm text-muted-foreground">No videos yet.</p>
        </div>
      {/if}
    </div>
  </section>
</main>
