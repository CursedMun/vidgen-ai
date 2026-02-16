<script lang="ts">
    import { createTrpcClient } from '$lib/trpc/client';
    import * as Card from '$lib/components/ui/card';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Button } from '$lib/components/ui/button';
    import { Textarea } from "$lib/components/ui/textarea/index.js";
    import { Badge } from '$lib/components/ui/badge';

    let name = $state<string>('');
    let image = $state<string | undefined>('');
    let imagePrompt = $state<string>('');;
    let videoPrompt = $state<string>('');;
    let audioPrompt = $state<string>('');;
    let isSaving = false;
    const trpc = createTrpcClient();

    let presets = $state(
    [] as Awaited<ReturnType<typeof trpc.presets.list.query>>,
  );
    async function savePreset() {
      if (!name) return alert("Dê um nome ao preset");
  
      try {
        await trpc.presets.create.mutate({ 
          name, 
          imagePrompt, 
          videoPrompt, 
          audioPrompt,
          avatar: image,
        });
        
        // clear
        name = '';
        image = '';
        imagePrompt = '';
        videoPrompt = '';
        audioPrompt = '';
        
        location.reload(); 
      } catch (e) {
        console.error("Erro ao salvar:", e);
        alert("Erro ao salvar preset");
      }
    }

    function handleFileChange(event) {
    const target = event.target;
    const file = target.files?.[0];
    console.log('file: ', file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        image = e.target?.result;
        console.log('image: ', image);
      };
      reader.readAsDataURL(file);
    }
  }

    const load = async () => {
        presets = await trpc.presets.list.query();
    };

    $effect(() => {
        load();
    });
  </script>

  <main class="container mx-auto flex flex-col py-8 gap-6 overflow-hidden">
    <header class="mb-6">
        <h1 class="text-2xl font-bold text-muted-foreground">Presets</h1>
        <p class="text-muted-foreground text-sm">Configure prompt styles for video automation.</p>
      </header>
      
      <section class="flex flex-1 gap-6 min-h-0 overflow-hidden">
        <div class="w-150 flex-none space-y-6">
          <Card.Root>
            <Card.Header>
              <Card.Description>Config</Card.Description>
              <Card.Title>New Preset</Card.Title>
              <Card.Description>
                Define the specific instructions that AI models. <br/>
                Ex: "You are an expert sports scriptwriter for short-form videos (TikTok/Reels).
                Your goal is to transform a transcription into a natural, engaging narration."
              </Card.Description>
            </Card.Header>
            <Card.Content class="space-y-4">
              <div class="space-y-2">
                <Label for="name">Preset name</Label>
                <Input id="name" bind:value={name} placeholder="Ex: Notícias de Futebol" />
              </div>

              <div class="space-y-2">
                {#if image}
                    <img src={image} alt="Preview" class="h-12 w-12 rounded-full object-cover border" />
                {/if}
                <Label for="name">Image/Avatar</Label>
                <Input id="image" type="file" accept="image/*" onchange={handleFileChange} />
              </div>
      
              <div class="space-y-2">
                <Label for="imagePrompt">Prompt: Image</Label>
                <Textarea id="imagePrompt" bind:value={imagePrompt} placeholder="Instruções para a imagem..." rows={3} />
              </div>
      
              <div class="space-y-2">
                <Label for="videoPrompt">Prompt: Video</Label>
                <Textarea id="videoPrompt" bind:value={videoPrompt} placeholder="Movimento e ritmo..." rows={3} />
              </div>
      
              <div class="space-y-2">
                <Label for="audioPrompt">Prompt: Audio</Label>
                <Textarea id="audioPrompt" bind:value={audioPrompt} placeholder="Estilo da narração..." rows={3} />
              </div>
      
              <Button 
                class="w-full" 
                disabled={isSaving || !name} 
                onclick={savePreset}
              >
                {isSaving ? 'Guardando...' : 'Guardar Preset'}
              </Button>
            </Card.Content>
          </Card.Root>
        </div>
      
        <Card.Root class="flex flex-col flex-1 min-h-0">
          <Card.Header class="flex-none">
            <div class="flex items-center justify-between">
              <div class="space-y-1.5">
                <Card.Description>Library</Card.Description>
                <Card.Title>Saved presets</Card.Title>
              </div>
              {#await presets}
                 <Badge variant="outline" class="h-9 w-9 rounded-full p-0 flex items-center justify-center">...</Badge>
              {:then data}
                <Badge variant="secondary" class="h-9 w-9 rounded-full p-0 flex items-center justify-center">
                  {data?.length ?? 0}
                </Badge>
              {/await}
            </div>
          </Card.Header>
      
          <Card.Content class="flex-1 overflow-hidden">
            {#await presets}
              <div class="flex items-center justify-center h-full text-muted-foreground italic">
                Carregando presets...
              </div>
            {:then data}
              {#if data && data.length > 0}
                <div class="h-full space-y-3 overflow-y-auto pr-2">
                  {#each data as preset}
                    <div class="flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/50">
                      <div class="flex items-center justify-between border-b pb-2">
                        <p class="font-bold text-lg">{preset.name}</p>
                        <Badge variant="outline" class="text-[10px] uppercase">
                          {new Date(preset.createdAt).toLocaleDateString()}
                        </Badge>
                      </div>
                      
                      <div class="grid grid-cols-1 gap-2 text-xs">
                        <div class="bg-muted/50 p-2 rounded">
                          <span class="font-semibold text-primary block mb-1">IMAGE PROMPT:</span>
                          <p class="text-muted-foreground line-clamp-2">{preset.imagePrompt}</p>
                        </div>
                        <div class="bg-muted/50 p-2 rounded">
                          <span class="font-semibold text-primary block mb-1">VIDEO PROMPT:</span>
                          <p class="text-muted-foreground line-clamp-2">{preset.videoPrompt}</p>
                        </div>
                        <div class="bg-muted/50 p-2 rounded">
                          <span class="font-semibold text-primary block mb-1">AUDIO PROMPT:</span>
                          <p class="text-muted-foreground line-clamp-2">{preset.audioPrompt}</p>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="rounded-lg border border-dashed p-12 text-center">
                  <p class="text-sm text-muted-foreground">
                    There are no presets configured yet.
                  </p>
                </div>
              {/if}
            {/await}
          </Card.Content>
        </Card.Root>
      </section>
</main>