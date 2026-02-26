<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { createTrpcClient } from '$lib/trpc/client';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from "@/components/ui/select";
  import { Link, Plus, Search, Trash2, Youtube } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';

  const trpc = createTrpcClient();

  let sources = $state(
    [] as Awaited<ReturnType<typeof trpc.sources.list.query>>,
  );

  // Form state
  let isDialogOpen = $state(false);
  let isDeleteDialogOpen = $state(false);
  let isEditDialogOpen = $state(false);
  let sourceToDelete = $state<number | null>(null);
  let selectedSource = $state<any>(null);
  let name = $state<string>('');
  let url = $state<string>('');
  let type = $state<'youtube' | 'rss'>('youtube');
  let isSaving = $state(false);
  let isDeleting = $state(false);
  let isEditing = $state(false);
  let searchQuery = $state('');

  // Test state
  let isTestDialogOpen = $state(false);
  let testUrl = $state('');
  let isTesting = $state(false);
  let testResult = $state<any>(null);

  // Pagination state
  let currentPage = $state(1);
  const itemsPerPage = 6;

  // Filter sources based on search query
  let filteredSources = $derived(searchQuery.trim()
    ? sources.filter(
        (s) =>
          (s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
          (s.url?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
          (s.type?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false),
      )
    : sources);

  // Reset to first page when search changes
  $effect(() => {
    currentPage = 1;
  });

  let totalPages = $derived(Math.ceil(filteredSources.length / itemsPerPage));
  let paginatedSources = $derived(
    filteredSources.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    )
  );

  async function saveSource() {
    if (!name) {
      toast.error('Please enter a source name');
      return;
    }
    if (!url) {
      toast.error('Please enter a URL');
      return;
    }

    isSaving = true;
    try {
      await trpc.sources.create.mutate({ 
        name, 
        url,
        type,
      });
      
      // Clear form
      name = '';
      url = '';
      type = 'youtube';
      isDialogOpen = false;
      
      await loadSources();
      toast.success('Source created successfully!');
    } catch (error) {
      console.error('Error saving source:', error);
      toast.error('Failed to save source');
    } finally {
      isSaving = false;
    }
  }

  function openDeleteDialog(id: number) {
    sourceToDelete = id;
    isDeleteDialogOpen = true;
  }

  function openEditDialog(source: any) {
    selectedSource = source;
    name = source.name;
    url = source.url;
    type = source.type;
    isEditDialogOpen = true;
  }

  async function updateSource() {
    if (!name || !url || !selectedSource) return;

    isEditing = true;
    try {
      await trpc.sources.update.mutate({
        id: selectedSource.id,
        name,
        url,
        type,
      });

      // Clear form
      name = '';
      url = '';
      type = 'youtube';
      selectedSource = null;
      isEditDialogOpen = false;

      await loadSources();
      toast.success('Source updated successfully!');
    } catch (error) {
      console.error('Error updating source:', error);
      toast.error('Failed to update source');
    } finally {
      isEditing = false;
    }
  }

  async function confirmDelete() {
    if (!sourceToDelete) return;

    isDeleting = true;
    try {
      await trpc.sources.delete.mutate({ id: sourceToDelete });
      await loadSources();
      toast.success('Source deleted');
      isDeleteDialogOpen = false;
      sourceToDelete = null;
    } catch (error) {
      console.error('Error deleting source:', error);
      toast.error('Failed to delete source');
    } finally {
      isDeleting = false;
    }
  }

  async function loadSources() {
    sources = await trpc.sources.list.query();
  }

  async function testYoutubeChannel() {
    if (!testUrl) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    isTesting = true;
    testResult = null;
    try {
      const result = await trpc.sources.testYoutubeChannel.mutate({ url: testUrl });
      testResult = result;
      toast.success(`Found channel: ${result.channelName}`);
    } catch (error: any) {
      console.error('Error testing YouTube channel:', error);
      toast.error(error.message || 'Failed to fetch YouTube channel');
      testResult = { error: error.message };
    } finally {
      isTesting = false;
    }
  }

  // Load sources on mount
  onMount(() => {
    loadSources();
  });
</script>

<main class="container mx-auto flex flex-col py-8 gap-6">
  <header class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-foreground">Content Sources</h1>
      <p class="text-muted-foreground text-sm">
        Manage RSS feeds and YouTube channels for content automation.
      </p>
    </div>

    <div class="flex gap-2">
      <Button 
        variant="outline"
        class="gap-2"
        onclick={() => {
          testUrl = '';
          testResult = null;
          isTestDialogOpen = true;
        }}
      >
        <Search class="h-4 w-4" />
        Test YouTube Channel
      </Button>

      <Dialog.Root bind:open={isDialogOpen}>
        <Dialog.Trigger asChild>
          <Button 
            class="gap-2"
            onclick={() => {
              // Clear form when opening new source dialog
              name = '';
              url = '';
              type = 'youtube';
            }}
          >
            <Plus class="h-4 w-4" />
            New Source
          </Button>
        </Dialog.Trigger>
      <Dialog.Content class="max-w-md">
        <Dialog.Header>
          <Dialog.Title>Create New Source</Dialog.Title>
          <Dialog.Description>
            Add a new RSS feed or YouTube channel as a content source.
          </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="source-name">Source Name</Label>
            <Input
              id="source-name"
              bind:value={name}
              placeholder="e.g., Tech News Feed"
            />
          </div>

          <div class="space-y-2">
            <Label for="source-type">Type</Label>
            <Select type="single" bind:value={type}>
              <SelectTrigger class="w-full capitalize">{type}</SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="rss">RSS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="source-url">URL</Label>
            <Input
              id="source-url"
              bind:value={url}
              placeholder={type === 'youtube' ? 'https://youtube.com/@channel' : 'https://example.com/feed.xml'}
              type="url"
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
          <Button onclick={saveSource} disabled={isSaving || !name || !url}>
            {isSaving ? 'Saving...' : 'Save Source'}
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
          placeholder="Search sources by name, URL, or type..."
          class="pl-10 max-w-md"
        />
      </div>
    </div>

    {#if paginatedSources.length > 0}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each paginatedSources as source (source.id)}
          <div class="group cursor-pointer">
            <div 
              class="relative rounded-lg overflow-hidden border transition-all hover:border-primary"
              role="button"
              tabindex="0"
              onclick={() => openEditDialog(source)}
              onkeydown={(e) => e.key === 'Enter' && openEditDialog(source)}
            >
              <div class="p-4">
                <div class="flex items-start justify-between mb-3">
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-sm truncate flex items-center gap-2">
                      {#if source.type === 'youtube'}
                        <Youtube class="h-4 w-4 text-destructive" />
                      {:else}
                        <Link class="h-4 w-4 text-primary" />
                      {/if}
                      {source.name}
                    </h3>
                    <p class="text-xs text-muted-foreground mt-1 truncate">{source.url}</p>
                  </div>
                  <Badge variant="outline" class="capitalize font-normal text-xs">
                    {source.type}
                  </Badge>
                </div>

                <div class="flex items-center justify-between text-xs pt-3 border-t">
                  <span class="text-muted-foreground">Created</span>
                  <span class="font-medium">{new Date(source.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div class="p-3 border-t flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onclick={(e) => {
                    e.stopPropagation();
                    openEditDialog(source);
                  }}
                  class="flex-1 h-8"
                >
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onclick={(e) => {
                    e.stopPropagation();
                    openDeleteDialog(source.id);
                  }}
                  class="h-8"
                >
                  <Trash2 size={12} />
                </Button>
              </div>
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
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onclick={() => (currentPage = page)}
                  class="w-8"
                >
                  {page}
                </Button>
              {:else if page === currentPage - 2 || page === currentPage + 2}
                <span class="px-1">...</span>
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
          No sources found matching "{searchQuery}"
        </p>
      </div>
    {:else}
      <div class="rounded-lg border border-dashed p-12 text-center">
        <Link class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p class="text-sm text-muted-foreground mb-4">
          No sources created yet. Add your first content source to get started.
        </p>
        <Button onclick={() => (isDialogOpen = true)} class="gap-2">
          <Plus class="h-4 w-4" />
          Create Source
        </Button>
      </div>
    {/if}
  </div>

  <!-- Delete Confirmation Dialog -->
  <Dialog.Root bind:open={isDeleteDialogOpen}>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Delete Source</Dialog.Title>
        <Dialog.Description>
          Are you sure you want to delete this source? This will affect all workflows using this source.
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer>
        <Button
          variant="outline"
          onclick={() => {
            isDeleteDialogOpen = false;
            sourceToDelete = null;
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

  <!-- Edit Source Dialog -->
  <Dialog.Root bind:open={isEditDialogOpen}>
    <Dialog.Content class="max-w-md">
      <Dialog.Header>
        <Dialog.Title>Edit Source</Dialog.Title>
        <Dialog.Description>
          Update your content source details.
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label for="edit-source-name">Source Name</Label>
          <Input
            id="edit-source-name"
            bind:value={name}
            placeholder="e.g., Tech News Feed"
          />
        </div>

        <div class="space-y-2">
          <Label for="edit-source-type">Type</Label>
          <Select type="single" bind:value={type}>
            <SelectTrigger class="w-full capitalize">{type}</SelectTrigger>
            <SelectContent>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="rss">RSS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="edit-source-url">URL</Label>
          <Input
            id="edit-source-url"
            bind:value={url}
            placeholder={type === 'youtube' ? 'https://youtube.com/@channel' : 'https://example.com/feed.xml'}
            type="url"
          />
        </div>

        {#if selectedSource?.createdAt}
          <div class="pt-4 border-t">
            <p class="text-xs text-muted-foreground">
              Created {new Date(selectedSource.createdAt).toLocaleString()}
            </p>
            {#if selectedSource?.updatedAt}
              <p class="text-xs text-muted-foreground">
                Updated {new Date(selectedSource.updatedAt).toLocaleString()}
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
            name = '';
            url = '';
            type = 'youtube';
            selectedSource = null;
          }}
          disabled={isEditing}
        >
          Cancel
        </Button>
        <Button onclick={updateSource} disabled={isEditing || !name || !url}>
          {isEditing ? 'Updating...' : 'Update Source'}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <!-- Test YouTube Channel Dialog -->
  <Dialog.Root bind:open={isTestDialogOpen}>
    <Dialog.Content class="max-w-md">
      <Dialog.Header>
        <Dialog.Title>Test YouTube Channel</Dialog.Title>
        <Dialog.Description>
          Enter a YouTube channel URL to test the channel lookup functionality.
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label for="test-url">YouTube Channel URL</Label>
          <Input
            id="test-url"
            bind:value={testUrl}
            placeholder="https://youtube.com/@channel"
            type="url"
          />
          <p class="text-xs text-muted-foreground">
            Supports: @username, /channel/ID, /c/name, /user/name formats
          </p>
        </div>

        {#if testResult}
          <div class="rounded-lg border p-4 space-y-2">
            {#if testResult.error}
              <div class="text-sm text-destructive">
                <strong>Error:</strong> {testResult.error}
              </div>
            {:else}
              <div class="space-y-1">
                <div class="text-sm">
                  <strong class="text-foreground">Channel Name:</strong>
                  <span class="text-muted-foreground ml-2">{testResult.channelName}</span>
                </div>
                <div class="text-sm">
                  <strong class="text-foreground">Channel ID:</strong>
                  <span class="text-muted-foreground ml-2 font-mono text-xs">{testResult.channelId}</span>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <Dialog.Footer>
        <Button
          variant="outline"
          onclick={() => {
            isTestDialogOpen = false;
            testUrl = '';
            testResult = null;
          }}
          disabled={isTesting}
        >
          Close
        </Button>
        <Button onclick={testYoutubeChannel} disabled={isTesting || !testUrl}>
          {isTesting ? 'Testing...' : 'Test Channel'}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</main>
