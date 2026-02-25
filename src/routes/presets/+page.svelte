<script lang="ts">
    import PromptSelect from '$lib/components/prompt-select.svelte';
    import { Button } from '$lib/components/ui/button';
    import * as Dialog from '$lib/components/ui/dialog';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Textarea } from "$lib/components/ui/textarea/index.js";
    import { createTrpcClient } from '$lib/trpc/client';
    import { ImageIcon, Plus, Search, Trash2 } from 'lucide-svelte';
    import { onMount } from 'svelte';
    import { toast } from 'svelte-sonner';

    const trpc = createTrpcClient();

    let presets = $state(
      [] as Awaited<ReturnType<typeof trpc.presets.list.query>>,
    );

    let prompts = $state(
      [] as Awaited<ReturnType<typeof trpc.prompts.list.query>>,
    );

    // Form state
    let isDialogOpen = $state(false);
    let isDeleteDialogOpen = $state(false);
    let isEditDialogOpen = $state(false);
    let presetToDelete = $state<number | null>(null);
    let selectedPreset = $state<any>(null);
    let name = $state<string>('');
    let description = $state<string>('');
    let selectedImagePromptId = $state<string | undefined>('custom');
    let selectedVideoPromptId = $state<string | undefined>('custom');
    let selectedAudioPromptId = $state<string | undefined>('custom');
    let files = $state<Array<{ data: string; type: string }>>([]);
    let imagePrompt = $state<string>('');
    let videoPrompt = $state<string>('');
    let audioPrompt = $state<string>('');
    let isSaving = $state(false);
    let isDeleting = $state(false);
    let isEditing = $state(false);
    let searchQuery = $state('');

    // Pagination state
    let currentPage = $state(1);
    const itemsPerPage = 6;

    // Filter presets based on search query
    let filteredPresets = $derived(searchQuery.trim()
      ? presets.filter(
          (p) =>
            (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
            (p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false),
        )
      : presets)

    // Reset to first page when search changes
    $effect(() => {
      currentPage = 1;
    });

    let totalPages = $derived(Math.ceil(filteredPresets.length / itemsPerPage))
    let paginatedPresets = $derived(
  filteredPresets.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    )
    )
    function handleFileChange(event: Event) {
      const target = event.target as HTMLInputElement;
      const selectedFiles = Array.from(target.files || []);
      
      if (selectedFiles.length + files.length > 3) {
        toast.error('Maximum 3 files allowed');
        return;
      }
      
      selectedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          files = [...files, { data: e.target?.result as string, type: file.type }];
        };
        reader.readAsDataURL(file);
      });
      
      // Reset input
      target.value = '';
    }
    
    function removeFile(index: number) {
      files = files.filter((_, i) => i !== index);
    }

    async function savePreset() {
      if (!name) {
        toast.error('Please enter a preset name');
        return;
      }
  
      isSaving = true;
      try {
        await trpc.presets.create.mutate({ 
          name, 
          description,
          assets: files.map(f => ({ data: f.data, type: f.type })),
          audioPromptId: selectedAudioPromptId ? parseInt(selectedAudioPromptId) : undefined,
          imagePromptId: selectedImagePromptId ? parseInt(selectedImagePromptId) : undefined,
          videoPromptId: selectedVideoPromptId ? parseInt(selectedVideoPromptId) : undefined,
        });
        
        // Clear form
        name = '';
        description = '';
        files = [];
        imagePrompt = '';
        videoPrompt = '';
        audioPrompt = '';
        selectedImagePromptId = undefined;
        selectedVideoPromptId = undefined;
        selectedAudioPromptId = undefined;
        isDialogOpen = false;
        
        await loadPresets();
        toast.success('Preset created successfully!');
      } catch (error) {
        console.error('Error saving preset:', error);
        toast.error('Failed to save preset');
      } finally {
        isSaving = false;
      }
    }

    function openDeleteDialog(id: number) {
      presetToDelete = id;
      isDeleteDialogOpen = true;
    }

    function openEditDialog(preset: any) {
      selectedPreset = preset;
      name = preset.name;
      description = preset.description || '';
      files = preset.assets?.map((asset: any) => ({ data: asset.url, type: asset.type })) || [];
      
      // Set selected prompt IDs from preset
      selectedImagePromptId = preset.imagePromptId?.toString();
      selectedVideoPromptId = preset.videoPromptId?.toString();
      selectedAudioPromptId = preset.audioPromptId?.toString();
      
      // Set prompt content from selected prompts
      if (preset.imagePromptId) {
        const prompt = prompts.find(p => p.id === preset.imagePromptId);
        imagePrompt = prompt?.content || '';
      } else {
        imagePrompt = '';
      }
      
      if (preset.videoPromptId) {
        const prompt = prompts.find(p => p.id === preset.videoPromptId);
        videoPrompt = prompt?.content || '';
      } else {
        videoPrompt = '';
      }
      
      if (preset.audioPromptId) {
        const prompt = prompts.find(p => p.id === preset.audioPromptId);
        audioPrompt = prompt?.content || '';
      } else {
        audioPrompt = '';
      }
      
      isEditDialogOpen = true;
    }

    async function updatePreset() {
      if (!name || !selectedPreset) return;

      isEditing = true;
      try {
        await trpc.presets.update.mutate({
          id: selectedPreset.id,
          name,
          description,
          assets: files.map(f => ({ data: f.data, type: f.type })),
          audioPromptId: selectedAudioPromptId ? parseInt(selectedAudioPromptId) : undefined,
          imagePromptId: selectedImagePromptId ? parseInt(selectedImagePromptId) : undefined,
          videoPromptId: selectedVideoPromptId ? parseInt(selectedVideoPromptId) : undefined,
        });

        // Clear form
        name = '';
        description = '';
        files = [];
        imagePrompt = '';
        videoPrompt = '';
        audioPrompt = '';
        selectedImagePromptId = undefined;
        selectedVideoPromptId = undefined;
        selectedAudioPromptId = undefined;
        selectedPreset = null;
        isEditDialogOpen = false;

        await loadPresets();
        toast.success('Preset updated successfully!');
      } catch (error) {
        console.error('Error updating preset:', error);
        toast.error('Failed to update preset');
      } finally {
        isEditing = false;
      }
    }

    async function confirmDelete() {
      if (!presetToDelete) return;

      isDeleting = true;
      try {
        await trpc.presets.deletePreset.mutate({ id: presetToDelete });
        await loadPresets();
        toast.success('Preset deleted');
        isDeleteDialogOpen = false;
        presetToDelete = null;
      } catch (error) {
        console.error('Error deleting preset:', error);
        toast.error('Failed to delete preset');
      } finally {
        isDeleting = false;
      }
    }

    async function loadPresets() {
      presets = await trpc.presets.list.query();
    }

    async function loadPrompts() {
      prompts = await trpc.prompts.list.query();
    }

    // Filter prompts by type
    let imagePrompts = $derived(prompts.filter(p => p.type === 'image'));
    let videoPrompts = $derived(prompts.filter(p => p.type === 'video'));
    let audioPrompts = $derived(prompts.filter(p => p.type === 'audio'));

    // Watch for prompt selection changes and update textarea content
    $effect(() => {
      if (selectedImagePromptId) {
        const prompt = prompts.find(p => p.id.toString() === selectedImagePromptId);
        if (prompt) imagePrompt = prompt.content;
      }
    });

    $effect(() => {
      if (selectedVideoPromptId) {
        const prompt = prompts.find(p => p.id.toString() === selectedVideoPromptId);
        if (prompt) videoPrompt = prompt.content;
      }
    });

    $effect(() => {
      if (selectedAudioPromptId) {
        const prompt = prompts.find(p => p.id.toString() === selectedAudioPromptId);
        if (prompt) audioPrompt = prompt.content;
      }
    });

    // Load presets and prompts on mount
    onMount(() => {
      loadPresets();
      loadPrompts();
    });
  </script>

  <main class="container mx-auto flex flex-col py-8 gap-6">
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Presets Library</h1>
        <p class="text-muted-foreground text-sm">
          Configure prompt styles for video automation.
        </p>
      </div>

      <Dialog.Root bind:open={isDialogOpen}>
        <Dialog.Trigger asChild>
          <Button 
            class="gap-2"
            onclick={() => {
              // Clear form when opening new preset dialog
              name = '';
              description = '';
              files = [];
              imagePrompt = '';
              videoPrompt = '';
              audioPrompt = '';
              selectedImagePromptId = undefined;
              selectedVideoPromptId = undefined;
              selectedAudioPromptId = undefined;
            }}
          >
            <Plus class="h-4 w-4" />
            New Preset
          </Button>
        </Dialog.Trigger>
        <Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
          <Dialog.Header>
            <Dialog.Title>Create New Preset</Dialog.Title>
            <Dialog.Description>
              Define the specific instructions for AI models.
            </Dialog.Description>
          </Dialog.Header>

          <div class="space-y-4 py-4">
            <div class="space-y-2">
              <Label for="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                bind:value={name}
                placeholder="e.g., Sports Commentary Style"
              />
            </div>

            <div class="space-y-2">
              <Label for="preset-description">Description (Optional)</Label>
              <Textarea
                id="preset-description"
                bind:value={description}
                placeholder="Description for social media..."
                rows={3}
                class="resize-none"
              />
            </div>

            <div class="space-y-2">
              <Label for="preset-files">Media Files (Max 3 - Images/Videos)</Label>
              {#if files.length > 0}
                <div class="grid grid-cols-3 gap-2">
                  {#each files as file, index}
                    <div class="relative aspect-square rounded-lg overflow-hidden border">
                      {#if file.type.startsWith('image/')}
                        <img
                          src={file.data}
                          alt="Preview {index + 1}"
                          class="w-full h-full object-cover"
                        />
                      {:else if file.type.startsWith('video/')}
                        <video
                          src={file.data}
                          class="w-full h-full object-cover"
                          muted
                        ></video>
                      {/if}
                      <Button
                        variant="destructive"
                        size="icon"
                        class="absolute top-1 right-1 h-6 w-6"
                        onclick={() => removeFile(index)}
                      >
                        <Trash2 class="h-3 w-3" />
                      </Button>
                    </div>
                  {/each}
                </div>
              {/if}
              {#if files.length < 3}
                <label
                  for="preset-files"
                  class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <Plus class="h-8 w-8 text-muted-foreground mb-2" />
                  <span class="text-sm text-muted-foreground"
                    >Add images or videos ({files.length}/3)</span
                  >
                  <Input
                    id="preset-files"
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    class="hidden"
                    onchange={handleFileChange}
                  />
                </label>
              {/if}
            </div>

            <div class="space-y-2">
              <Label for="imagePrompt">Image Prompt</Label>
              <PromptSelect
                prompts={imagePrompts}
                bind:value={selectedImagePromptId}
                placeholder="Select an image prompt"
              />
              <Textarea
                id="imagePrompt"
                bind:value={imagePrompt}
                placeholder="Instructions for image generation..."
                rows={3}
                class="resize-none"
                disabled={!!selectedImagePromptId}
              />
            </div>

            <div class="space-y-2">
              <Label for="videoPrompt">Video Prompt</Label>
              <PromptSelect
                prompts={videoPrompts}
                bind:value={selectedVideoPromptId}
                placeholder="Select a video prompt"
              />
              <Textarea
                id="videoPrompt"
                bind:value={videoPrompt}
                placeholder="Movement and rhythm instructions..."
                rows={3}
                class="resize-none"
                disabled={!!selectedVideoPromptId}
              />
            </div>

            <div class="space-y-2">
              <Label for="audioPrompt">Audio Prompt</Label>
              <PromptSelect
                prompts={audioPrompts}
                bind:value={selectedAudioPromptId}
                placeholder="Select an audio prompt"
              />
              <Textarea
                id="audioPrompt"
                bind:value={audioPrompt}
                placeholder="Narrative style instructions..."
                rows={3}
                class="resize-none"
                disabled={!!selectedAudioPromptId}
              />
            </div>
          </div>

          <Dialog.Footer>
            <Button
              variant="outline"
              onclick={() => (isDialogOpen = false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onclick={savePreset} disabled={isSaving || !name}>
              {isSaving ? 'Saving...' : 'Save Preset'}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </header>

    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div class="flex-1 relative">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <Input
            bind:value={searchQuery}
            placeholder="Search presets by name or description..."
            class="pl-10 max-w-md"
          />
        </div>
      </div>

      {#if paginatedPresets.length > 0}
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          {#each paginatedPresets as preset}
            <div
              role="button"
              tabindex="0"
              class="group cursor-pointer"
              onclick={() => openEditDialog(preset)}
              onkeydown={(e) => e.key === 'Enter' && openEditDialog(preset)}
            >
              <div class="relative rounded-lg overflow-hidden transition-all">
                {#if preset.assets && preset.assets.length > 0}
                  <div class="relative w-full aspect-video bg-muted">
                    <img
                      src={preset.assets[0].url}
                      alt={preset.name}
                      class="w-full h-full object-contain"
                    />

                    <Button
                      variant="destructive"
                      size="icon"
                      class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onclick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(preset.id);
                      }}
                    >
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                 
                {:else}
                  <div class="relative w-full aspect-square bg-muted flex items-center justify-center">
                    <ImageIcon class="h-12 w-12 text-muted-foreground" />

                    <Button
                      variant="destructive"
                      size="icon"
                      class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onclick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(preset.id);
                      }}
                    >
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                {/if}
              </div>

              <div class="mt-2">
                <h3 class="font-semibold text-sm text-foreground truncate">{preset.name}</h3>
                {#if preset.description}
                  <p class="text-xs text-muted-foreground truncate">{preset.description}</p>
                {/if}
              </div>
            </div>
          {/each}
        </div>

        {#if totalPages > 1}
          <div class="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onclick={() => (currentPage = Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>

            <div class="flex items-center gap-1">
              {#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
                {#if page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)}
                  <Button
                    variant={page === currentPage ? 'default' : 'outline'}
                    size="sm"
                    class="w-10"
                    onclick={() => (currentPage = page)}
                  >
                    {page}
                  </Button>
                {:else if page === currentPage - 2 || page === currentPage + 2}
                  <span class="px-2 text-muted-foreground">...</span>
                {/if}
              {/each}
            </div>

            <Button
              variant="outline"
              size="sm"
              onclick={() =>
                (currentPage = Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        {/if}
      {:else if searchQuery}
        <div class="text-center py-12">
          <p class="text-muted-foreground">
            No presets found matching "{searchQuery}"
          </p>
        </div>
      {:else}
        <div class="rounded-lg border border-dashed p-12 text-center">
          <ImageIcon class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p class="text-sm text-muted-foreground mb-4">
            No presets created yet. Create your first preset to get started.
          </p>
          <Button onclick={() => (isDialogOpen = true)} class="gap-2">
            <Plus class="h-4 w-4" />
            Create Preset
          </Button>
        </div>
      {/if}
    </div>

    <!-- Delete Confirmation Dialog -->
    <Dialog.Root bind:open={isDeleteDialogOpen}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Delete Preset</Dialog.Title>
          <Dialog.Description>
            Are you sure you want to delete this preset? This will also delete all associated workflows.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Button
            variant="outline"
            onclick={() => {
              isDeleteDialogOpen = false;
              presetToDelete = null;
            }}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onclick={confirmDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>

    <!-- Edit Preset Dialog -->
    <Dialog.Root bind:open={isEditDialogOpen}>
      <Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
        <Dialog.Header>
          <Dialog.Title>Edit Preset</Dialog.Title>
          <Dialog.Description>
            Update your preset details and prompts.
          </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="edit-preset-name">Preset Name</Label>
            <Input
              id="edit-preset-name"
              bind:value={name}
              placeholder="e.g., Sports Commentary Style"
            />
          </div>

          <div class="space-y-2">
            <Label for="edit-preset-description">Description (Optional)</Label>
            <Textarea
              id="edit-preset-description"
              bind:value={description}
              placeholder="Description for social media..."
              rows={3}
              class="resize-none"
            />
          </div>

          <div class="space-y-2">
            <Label for="edit-preset-files">Media Files (Max 3 - Images/Videos)</Label>
            {#if files.length > 0}
              <div class="grid grid-cols-3 gap-2">
                {#each files as file, index}
                  <div class="relative aspect-square rounded-lg overflow-hidden border">
                    {#if file.type.startsWith('image/')}
                      <img
                        src={file.data}
                        alt="Preview {index + 1}"
                        class="w-full h-full object-cover"
                      />
                    {:else if file.type.startsWith('video/')}
                      <video
                        src={file.data}
                        class="w-full h-full object-cover"
                        muted
                      ></video>
                    {/if}
                    <Button
                      variant="destructive"
                      size="icon"
                      class="absolute top-1 right-1 h-6 w-6"
                      onclick={() => removeFile(index)}
                    >
                      <Trash2 class="h-3 w-3" />
                    </Button>
                  </div>
                {/each}
              </div>
            {/if}
            {#if files.length < 3}
              <label
                for="edit-preset-files"
                class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
              >
                <Plus class="h-8 w-8 text-muted-foreground mb-2" />
                <span class="text-sm text-muted-foreground"
                  >Add images or videos ({files.length}/3)</span
                >
                <Input
                  id="edit-preset-files"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  class="hidden"
                  onchange={handleFileChange}
                />
              </label>
            {/if}
          </div>

          <div class="space-y-2">
            <Label for="edit-imagePrompt">Image Prompt</Label>
            <PromptSelect
              prompts={imagePrompts}
              bind:value={selectedImagePromptId}
              placeholder="Select an image prompt"
            />
            <Textarea
              id="edit-imagePrompt"
              bind:value={imagePrompt}
              placeholder="Instructions for image generation..."
              rows={3}
              class="resize-none"
              disabled={!!selectedImagePromptId}
            />
          </div>

          <div class="space-y-2">
            <Label for="edit-videoPrompt">Video Prompt</Label>
            <PromptSelect
              prompts={videoPrompts}
              bind:value={selectedVideoPromptId}
              placeholder="Select a video prompt"
            />
            <Textarea
              id="edit-videoPrompt"
              bind:value={videoPrompt}
              placeholder="Movement and rhythm instructions..."
              rows={3}
              class="resize-none"
              disabled={!!selectedVideoPromptId}
            />
          </div>

          <div class="space-y-2">
            <Label for="edit-audioPrompt">Audio Prompt</Label>
            <PromptSelect
              prompts={audioPrompts}
              bind:value={selectedAudioPromptId}
              placeholder="Select an audio prompt"
            />
            <Textarea
              id="edit-audioPrompt"
              bind:value={audioPrompt}
              placeholder="Narrative style instructions..."
              rows={3}
              class="resize-none"
              disabled={!!selectedAudioPromptId}
            />
          </div>

          {#if selectedPreset?.createdAt}
            <div class="pt-4 border-t">
              <p class="text-xs text-muted-foreground">
                Created: {new Date(selectedPreset.createdAt).toLocaleDateString()}
              </p>
              {#if selectedPreset?.updatedAt}
                <p class="text-xs text-muted-foreground">
                  Last updated: {new Date(selectedPreset.updatedAt).toLocaleDateString()}
                </p>
              {/if}
            </div>
          {/if}
        </div>

        <Dialog.Footer>
          <Button
            variant="outline"
            onclick={() => {
              isEditDialogOpen = false;
              selectedPreset = null;
              name = '';
              description = '';
              files = [];
              imagePrompt = '';
              videoPrompt = '';
              audioPrompt = '';
              selectedImagePromptId = undefined;
              selectedVideoPromptId = undefined;
              selectedAudioPromptId = undefined;
            }}
            disabled={isEditing}
          >
            Cancel
          </Button>
          <Button onclick={updatePreset} disabled={isEditing || !name}>
            {isEditing ? 'Updating...' : 'Update Preset'}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  </main>