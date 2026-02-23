<script lang="ts">
    import ChannelsJobs from '$lib/components/channels-jobs.svelte';
    import { Button } from '$lib/components/ui/button';
    import * as Card from '$lib/components/ui/card';
    import { createTrpcClient } from '$lib/trpc/client';
  import { Badge } from '@/components/ui/badge';
    import { IconBrandInstagram, IconBrandYoutube, IconPlus, IconCircleCheck } from "@tabler/icons-svelte";
    const trpc = createTrpcClient();
  
    let channels = $state(
      [] as Awaited<ReturnType<typeof trpc.channels.list.query>>,
    );
  
    let selectedPlatform = $state<'instagram' | 'youtube' | 'x' | 'tiktok' | null>(null);
    let selectedAccountId = $state<number | null>(null);
    let accounts = $state<{ id: number; name: string; expiresAt: string; updatedAt: string | null; instagramBusinessId: string; accessToken: string; }[]>([]);
    let accountsYoutube = $state<{ id: number; name: string; accessToken: string | null; refreshToken: string; expiryDate: number | null; clientId: string | null; }[]>([]);
    let newToken = $state("");
    let accountAlias = $state("");
  

    
    async function handleAddYoutube() {
      const authUrlQuery = await trpc.youtube.getAuthUrl.query();
      console.log('authUrlQuery: ', authUrlQuery);
      if (authUrlQuery) {
        // Abre a página de login do Google
        window.location.href = authUrlQuery;
      }
    }

    async function addAccount() {
      await trpc.videos.addInstagramAccount.mutate({ 
        shortLivedToken: newToken, 
        name: accountAlias 
      });
      newToken = ""; accountAlias = "";
      accounts = await trpc.videos.listInstagramAccounts.query();
    }
  
    const load = async () => {
      channels = await trpc.channels.list.query();
      accounts = await trpc.videos.listInstagramAccounts.query();
      accountsYoutube = await trpc.videos.listYoutubeAccounts.query();
    };
  
    $effect(() => {
      load();
    });
    async function connectTwitter() {
      selectedPlatform = 'x'; 
      selectedAccountId = null;
      const { redirectUrl } = await trpc.videos.authorizeX.query();
      if (redirectUrl) {
        window.open(redirectUrl.url, '_blank', 'noopener,noreferrer');
      }
    }
  </script>
  
  <main class="container mx-auto flex flex-col py-8 gap-6 overflow-hidden">
    <!-- Channels and Jobs Management -->
    <ChannelsJobs channels={channels || []} />
  
    <section class="w-full flex gap-6 mb-6 border border-none">  
      <div class="flex-1 min-w-[380px]">
        <Card.Root class="h-full shadow-sm">
          <div class="p-6">
            <div class="mb-4">
              <h3 class="text-lg font-bold text-gray-800">Novo Perfil Instagram</h3>
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
  </section>

  <section class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <Card.Root >
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-4">
        <div class="space-y-1">
          <Card.Title class="text-xl flex items-center gap-2">
            <IconBrandInstagram size={24} class="text-pink-500" />
            Contas Instagram
          </Card.Title>
        </div>
      </Card.Header>
      
      <Card.Content class="flex-1 overflow-y-auto custom-scrollbar">
        <div class="space-y-3">
          <div class="flex items-center justify-between p-4 rounded-xl border transition-colors">
            <div class="flex items-center gap-3">
              {#each accounts as acc}
                <div>
                  <p class="text-sm font-semibold">{acc.name} - {acc.instagramBusinessId}</p>
                </div>
              {/each}
            </div>
          </div>
          {#if !accounts}
          <div class="flex flex-col items-center justify-center h-32 border-2 border-dashed border-zinc-800 rounded-xl opacity-40">
             <IconBrandInstagram size={32} class="mb-2" />
             <p class="text-xs">Nenhuma conta vinculada</p>
          </div>
          {/if}
        </div>
      </Card.Content>
    </Card.Root>
  
    <Card.Root >
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-4">
        <div class="space-y-1">
          <Card.Title class="text-xl flex items-center gap-2">
            <IconBrandYoutube size={24} class="text-red-500" />
            Canais YouTube
          </Card.Title>
        </div>
        <Button onclick={handleAddYoutube} variant="outline" size="sm" class="h-8 gap-1">
          <IconPlus size={16} /> Conectar Canal
        </Button>
      </Card.Header>
      
      <Card.Content class="flex-1 overflow-y-auto custom-scrollbar gap-2">
        {#each accountsYoutube as acc}
        <div class="space-y-3 mb-2">
          <div class="flex items-center justify-between p-4 rounded-xl border transition-colors">
            <div class="flex items-center gap-3">
              <div class="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                <IconBrandYoutube size={24} />
              </div>
              <div>
                <p class="text-sm font-semibold">{acc.name}</p>
              </div>
            </div>
          </div>
        </div>
        {/each}
      </Card.Content>
    </Card.Root>
  
  </section>
  </main>
  