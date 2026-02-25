<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import { createTrpcClient } from '$lib/trpc/client';
  import Badge from '@/components/ui/badge/badge.svelte';
  import { ImageIcon, Plus, Search, Trash2 } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';

  const trpc = createTrpcClient();

  let prompts = $state(
    [] as Awaited<ReturnType<typeof trpc.prompts.list.query>>,
  );

  // Form state
  let isDialogOpen = $state(false);
  let isDeleteDialogOpen = $state(false);
  let isEditDialogOpen = $state(false);
  let promptToDelete = $state<number | null>(null);
  let selectedPrompt = $state<any>(null);
  let name = $state('');
  let content = $state('');
  let type = $state<'image' | 'video' | 'audio'>('video');
  let image = $state<string | undefined>(undefined);
  let searchQuery = $state('');
  let isSaving = $state(false);
  let isDeleting = $state(false);
  let isEditing = $state(false);

  // Pagination state
  let currentPage = $state(1);
  const itemsPerPage = 6;

  // Filter prompts based on search query
  let filteredPrompts = $derived(searchQuery.trim()
    ? prompts.filter(
        (p) =>
          (p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
          (p.content?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false),
      )
    : prompts)

  // Reset to first page when search changes
  $effect(() => {
    currentPage = 1;
    console.log(prompts)
  });

  let totalPages = $derived(Math.ceil(filteredPrompts.length / itemsPerPage))
  let paginatedPrompts = $derived(
filteredPrompts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )
  )

  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        image = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  async function savePrompt() {
    if (!name || !content) return;

    isSaving = true;
    try {
      await trpc.prompts.create.mutate({
        title: name,
        content,
        type,
        image,
      });

      // Clear form
      name = '';
      content = '';
      image = undefined;
      type = 'video';
      isDialogOpen = false;

      // Reload prompts
      await loadPrompts();
      toast.success('Prompt created successfully!');
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast.error('Failed to save prompt');
    } finally {
      isSaving = false;
    }
  }

  function openDeleteDialog(id: number) {
    promptToDelete = id;
    isDeleteDialogOpen = true;
  }

  function openEditDialog(prompt: any) {
    selectedPrompt = prompt;
    name = prompt.title;
    content = prompt.content;
    type = prompt.type;
    image = prompt.assets?.[0]?.url;
    isEditDialogOpen = true;
  }

  async function updatePrompt() {
    if (!name || !content || !selectedPrompt) return;

    isEditing = true;
    try {
      await trpc.prompts.update.mutate({
        id: selectedPrompt.id,
        title: name,
        content,
        type,
        image,
      });

      // Clear form
      name = '';
      content = '';
      image = undefined;
      type = 'video';
      selectedPrompt = null;
      isEditDialogOpen = false;

      // Reload prompts
      await loadPrompts();
      toast.success('Prompt updated successfully!');
    } catch (error) {
      console.error('Error updating prompt:', error);
      toast.error('Failed to update prompt');
    } finally {
      isEditing = false;
    }
  }

  async function confirmDelete() {
    if (!promptToDelete) return;

    isDeleting = true;
    try {
      await trpc.prompts.delete.mutate({ id: promptToDelete });
      await loadPrompts();
      toast.success('Prompt deleted');
      isDeleteDialogOpen = false;
      promptToDelete = null;
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast.error('Failed to delete prompt');
    } finally {
      isDeleting = false;
    }
  }

  async function loadPrompts() {
    prompts = await trpc.prompts.list.query();
  }

  // Load prompts on mount
  onMount(() => {
    loadPrompts();
  });

  function getTypeColor(promptType: string) {
    switch (promptType) {
      case 'video':
        return 'bg-primary';
      case 'image':
        return 'bg-secondary';
      case 'audio':
        return 'bg-accent';
      default:
        return 'bg-muted';
    }
  }
</script>

<main class="container mx-auto flex flex-col py-8 gap-6">
  <header class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-foreground">Prompts Library</h1>
      <p class="text-muted-foreground text-sm">
        Manage your AI prompts for different content types.
      </p>
    </div>

    <Dialog.Root bind:open={isDialogOpen}>
      <Dialog.Trigger asChild>
        <Button 
          class="gap-2"
          onclick={() => {
            // Clear form when opening new prompt dialog
            name = '';
            content = '';
            image = undefined;
            type = 'video';
          }}
        >
          <Plus class="h-4 w-4" />
          New Prompt
        </Button>
      </Dialog.Trigger>
      <Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
        <Dialog.Header>
          <Dialog.Title>Create New Prompt</Dialog.Title>
          <Dialog.Description>
            Add a new prompt template with optional reference image.
          </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="prompt-name">Prompt Name</Label>
            <Input
              id="prompt-name"
              bind:value={name}
              placeholder="e.g., Cinematic Sports Commentary"
            />
          </div>

          <div class="space-y-2">
            <Label for="prompt-type">Type</Label>
            <select
              id="prompt-type"
              bind:value={type}
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="video">Video</option>
              <option value="image">Image</option>
              <option value="audio">Audio</option>
            </select>
          </div>

          <div class="space-y-2">
            <Label for="prompt-content">Prompt Content</Label>
            <Textarea
              id="prompt-content"
              bind:value={content}
              placeholder="Enter your prompt instructions here..."
              rows={8}
              class="resize-none"
            />
          </div>

          <div class="space-y-2">
            <Label for="prompt-image">Reference Image (Optional)</Label>
            {#if image}
              <div class="relative w-full h-48 rounded-lg overflow-hidden border">
                <img
                  src={image}
                  alt="Preview"
                  class="w-full h-full object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  class="absolute top-2 right-2"
                  onclick={() => (image = undefined)}
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            {:else}
              <label
                for="prompt-image"
                class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
              >
                <ImageIcon class="h-8 w-8 text-muted-foreground mb-2" />
                <span class="text-sm text-muted-foreground"
                  >Click to upload image</span
                >
                <Input
                  id="prompt-image"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  onchange={handleFileChange}
                />
              </label>
            {/if}
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
          <Button onclick={savePrompt} disabled={isSaving || !name || !content}>
            {isSaving ? 'Saving...' : 'Save Prompt'}
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
          placeholder="Search prompts by name or content..."
          class="pl-10 max-w-md"
        />
      </div>
    </div>

    {#if paginatedPrompts.length > 0}
        <div class="grid grid-cols-2 md:grid-cols-3  gap-4">
          {#each paginatedPrompts as prompt}
            <div
              role="button"
              tabindex="0"
              class="group cursor-pointer"
              onclick={() => openEditDialog(prompt)}
              onkeydown={(e) => e.key === 'Enter' && openEditDialog(prompt)}
            >
              <div class="relative rounded-lg overflow-hidden transition-all">
                {#if prompt.assets && prompt.assets.length > 0}
                  <div class="relative w-full aspect-video">
                    <img
                      src={prompt.assets[0].url}
                      alt={prompt.title}
                      class="w-full h-full object-cover"
                    />

                    <Badge 
                      variant="secondary" 
                      class="absolute top-2 left-2 {getTypeColor(prompt.type)}"
                    >
                      {prompt.type}
                    </Badge>

                    <Button
                      variant="destructive"
                      size="icon"
                      class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onclick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(prompt.id);
                      }}
                    >
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                {:else}
                  <div class="relative w-full aspect-square bg-muted flex items-center justify-center">
                    <ImageIcon class="h-12 w-12 text-muted-foreground" />

                    <Badge 
                      variant="secondary" 
                      class="absolute top-2 left-2 {getTypeColor(prompt.type)}"
                    >
                      {prompt.type}
                    </Badge>

                    <Button
                      variant="destructive"
                      size="icon"
                      class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onclick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(prompt.id);
                      }}
                    >
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                {/if}
              </div>

              <div class="mt-2">
                <h3 class="font-semibold text-sm text-foreground truncate">{prompt.title}</h3>
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
            No prompts found matching "{searchQuery}"
          </p>
        </div>
      {:else}
        <div class="rounded-lg border border-dashed p-12 text-center">
          <ImageIcon class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p class="text-sm text-muted-foreground mb-4">
            No prompts created yet. Create your first prompt to get started.
          </p>
          <Button onclick={() => (isDialogOpen = true)} class="gap-2">
            <Plus class="h-4 w-4" />
            Create Prompt
          </Button>
        </div>
      {/if}
    </div>

  <!-- Delete Confirmation Dialog -->
  <Dialog.Root bind:open={isDeleteDialogOpen}>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Delete Prompt</Dialog.Title>
        <Dialog.Description>
          Are you sure you want to delete this prompt? This action cannot be undone.
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer>
        <Button
          variant="outline"
          onclick={() => {
            isDeleteDialogOpen = false;
            promptToDelete = null;
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

  <!-- Edit Prompt Dialog -->
  <Dialog.Root bind:open={isEditDialogOpen}>
    <Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
      <Dialog.Header>
        <Dialog.Title>Edit Prompt</Dialog.Title>
        <Dialog.Description>
          Update your prompt details and reference image.
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label for="edit-prompt-name">Prompt Name</Label>
          <Input
            id="edit-prompt-name"
            bind:value={name}
            placeholder="e.g., Cinematic Sports Commentary"
          />
        </div>

        <div class="space-y-2">
          <Label for="edit-prompt-type">Type</Label>
          <select
            id="edit-prompt-type"
            bind:value={type}
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="video">Video</option>
            <option value="image">Image</option>
            <option value="audio">Audio</option>
          </select>
        </div>

        <div class="space-y-2">
          <Label for="edit-prompt-content">Prompt Content</Label>
          <Textarea
            id="edit-prompt-content"
            bind:value={content}
            placeholder="Enter your prompt instructions here..."
            rows={8}
            class="resize-none"
          />
        </div>

        <div class="space-y-2">
          <Label for="edit-prompt-image">Reference Image (Optional)</Label>
          {#if image}
            <div class="relative w-full h-48 rounded-lg overflow-hidden border">
              <img
                src={image}
                alt="Preview"
                class="w-full h-full object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                class="absolute top-2 right-2"
                onclick={() => (image = undefined)}
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          {:else}
            <label
              for="edit-prompt-image"
              class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
            >
              <ImageIcon class="h-8 w-8 text-muted-foreground mb-2" />
              <span class="text-sm text-muted-foreground"
                >Click to upload image</span
              >
              <Input
                id="edit-prompt-image"
                type="file"
                accept="image/*"
                class="hidden"
                onchange={handleFileChange}
              />
            </label>
          {/if}
        </div>

        {#if selectedPrompt?.createdAt}
          <div class="pt-4 border-t">
            <p class="text-xs text-muted-foreground">
              Created: {new Date(selectedPrompt.createdAt).toLocaleDateString()}
            </p>
            {#if selectedPrompt?.updatedAt}
              <p class="text-xs text-muted-foreground">
                Last updated: {new Date(selectedPrompt.updatedAt).toLocaleDateString()}
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
            selectedPrompt = null;
            name = '';
            content = '';
            image = undefined;
            type = 'video';
          }}
          disabled={isEditing}
        >
          Cancel
        </Button>
        <Button onclick={updatePrompt} disabled={isEditing || !name || !content}>
          {isEditing ? 'Updating...' : 'Update Prompt'}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</main>
