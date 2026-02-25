<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Command from "$lib/components/ui/command";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import * as Popover from "$lib/components/ui/popover";
  import { createTrpcClient } from "$lib/trpc/client";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from "@/components/ui/select";
  import { cn } from "@/utils";
  import {
    Check,
    ChevronsUpDown,
    Clock,
    Instagram,
    Loader2,
    Pencil,
    Play,
    Plus,
    Search,
    Trash2,
    X,
    Youtube
  } from "lucide-svelte";
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  
  const trpc = createTrpcClient();
  
  let presets = $state([] as Awaited<ReturnType<typeof trpc.presets.list.query>>);
  let sources = $state([] as Awaited<ReturnType<typeof trpc.sources.list.query>>);
  let workflows = $state([] as Awaited<ReturnType<typeof trpc.workflows.list.query>>);
  let allAccounts = $state([] as Awaited<ReturnType<typeof trpc.videos.listInstagramAccounts.query>>);
  let open = $state(false);
  let isDeleteDialogOpen = $state(false);
  let workflowToDelete = $state<number | null>(null);
  let searchQuery = $state('');
  let isCreating = $state(false);
  let isDeleting = $state(false);
  let isRunning = $state(false);
  let selectedAccounts = $state([] as Awaited<ReturnType<typeof trpc.videos.listInstagramAccounts.query>>);
  const selectedLabels = $derived(
    selectedAccounts.map((a) => a.name).join(", ") || "Select accounts...",
  );

  let filteredWorkflows = $derived(searchQuery.trim()
    ? workflows.filter(
        (w) =>
          (w.title?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
          (w.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
          (w.preset?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false),
      )
    : workflows);
  
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
  
  let interval = $state("6h");
  let mediaType = $state("video" as "video" | "image");
  let model = $state("veo" as "veo" | "chatgpt");
  let sourceId = $state("");
  let presetId = $state("");
  let title = $state("");
  let description = $state("");
  
  const load = async () => {
    const instaAcconts = await trpc.videos.listInstagramAccounts.query();
    const youtubeAcconts = await trpc.videos.listYoutubeAccounts.query();
    allAccounts = [...instaAcconts, ...youtubeAcconts];
    presets = await trpc.presets.list.query();
    sources = await trpc.sources.list.query();
    workflows = await trpc.workflows.list.query();
  };
  
  onMount(() => {
    load();
  });
  
  const triggerInterval = $derived(
    interval === "1m"
      ? "Every minute"
      : interval === "10m"
        ? "Every 10 minutes"
        : interval === "1h"
          ? "Every hour"
          : interval === "6h"
            ? "Every 6 hours"
            : interval === "12h"
              ? "Every 12 hours"
              : interval === "1d"
                ? "Daily"
                : interval === "1w"
                  ? "Weekly"
                  : interval,
  );
  
  async function addAutomation() {
    if (!presetId) {
      toast.error('Please select a preset');
      return;
    }
    if (!title) {
      toast.error('Please enter a title');
      return;
    }
    
    isCreating = true;
    try {
      await trpc.workflows.create.mutate({
        title,
        description: description || undefined,
        interval,
        mediaType,
        model,
        sourceId: sourceId ? Number(sourceId) : undefined,
        presetId: Number(presetId),
        accountIds: selectedAccounts.map(a => a.id),
      });
  
      toast.success('Workflow created successfully!');
      open = false;
      
      // Clear form
      title = '';
      description = '';
      presetId = '';
      sourceId = '';
      selectedAccounts = [];
      
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to create workflow');
    } finally {
      isCreating = false;
    }
  }

  function openDeleteDialog(id: number) {
    workflowToDelete = id;
    isDeleteDialogOpen = true;
  }

  async function confirmDelete() {
    if (!workflowToDelete) return;

    isDeleting = true;
    try {
      await trpc.workflows.delete.mutate({ id: workflowToDelete });
      toast.success('Workflow deleted');
      isDeleteDialogOpen = false;
      workflowToDelete = null;
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete workflow');
    } finally {
      isDeleting = false;
    }
  }

  async function runWorkflow(id: number) {
    isRunning = true;
    try {
      await trpc.workflows.run.mutate({ id });
      toast.success('Workflow triggered successfully!');
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to run workflow');
    } finally {
      isRunning = false;
    }
  }
  </script>
  
  <main class="container mx-auto flex flex-col py-8 gap-6">
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Workflows</h1>
        <p class="text-muted-foreground text-sm">
          Manage your scheduled content workflows.
        </p>
      </div>

      <Button 
        class="gap-2"
        onclick={() => {
          open = true;
          // Clear form
          title = '';
          description = '';
          presetId = '';
          sourceId = '';
          selectedAccounts = [];
        }}
      >
        <Plus class="h-4 w-4" />
        New Workflow
      </Button>
    </header>

    <!-- Create/Edit Dialog -->
    <Dialog.Root bind:open>
        <Dialog.Content class="max-w-4xl max-h-[90vh] overflow-y-auto">
          <Dialog.Header>
            <Dialog.Title>Create New Workflow</Dialog.Title>
            <Dialog.Description>Configure your workflow settings</Dialog.Description>
          </Dialog.Header>
          <div class="space-y-4 py-4">
            
            <div class="space-y-2">
              <Label>Title</Label>
              <Input bind:value={title} placeholder="My automation name" class="w-full" />
            </div>

            <div class="space-y-2">
              <Label>Description (Optional)</Label>
              <Input bind:value={description} placeholder="Brief description..." class="w-full" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label>Preset</Label>
                <Select type="single" name="presets" bind:value={presetId}>
                  <SelectTrigger class="w-full">
                    {presets.find(p => p.id.toString() === presetId)?.name || 'Select preset...'}
                  </SelectTrigger>
                  <SelectContent>
                    {#each presets as p}
                      <SelectItem value={p.id.toString()}>{p.name}</SelectItem>
                    {/each}
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <Label>Target Accounts</Label>
                
                <Popover.Root>
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
                        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    {/snippet}
                  </Popover.Trigger>
              
                  <Popover.Content class="w-[300px] p-0" side="bottom" align="start">
                    <Command.Root>
                      <Command.List>
                          <Command.Empty>No accounts found.</Command.Empty>
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
                                    <Check class="h-4 w-4 text-primary" />
                                  {/if}
                                </div>
                          
                                {#if isInstagram}
                                  <Instagram class="h-4 w-4 text-chart-5" />
                                {:else}
                                  <Youtube class="h-4 w-4 text-destructive" />
                                {/if}
                          
                                <span class="flex-1 truncate">{account.name}</span>
                                <span class="text-[10px] uppercase opacity-50">
                                  {isInstagram ? 'IG' : 'YT'}
                                </span>
                              </Command.Item>
                            {/each}
                          </Command.Group>
                      </Command.List>
                    </Command.Root>
                  </Popover.Content>
                </Popover.Root>
              </div>
            </div>
            
            <div class="space-y-2">
              <Label>Content Source (Optional)</Label>
              <Select type="single" name="sources" bind:value={sourceId}>
                <SelectTrigger class="w-full">
                  {#if sourceId}
                    {@const source = sources.find(s => s.id.toString() === sourceId)}
                    {source ? `${source.name} (${source.type})` : 'Select source...'}
                  {:else}
                    Select source...
                  {/if}
                </SelectTrigger>
                <SelectContent>
                  {#if sources.length > 0}
                    {#each sources as source}
                      <SelectItem value={source.id.toString()}>
                        <div class="flex items-center justify-between w-full">
                          <span class="truncate">{source.name}</span>
                          <span class="text-xs text-muted-foreground ml-2 uppercase">{source.type}</span>
                        </div>
                      </SelectItem>
                    {/each}
                  {:else}
                    <div class="p-4 text-center text-sm text-muted-foreground">
                      No sources available. Create one first.
                    </div>
                  {/if}
                </SelectContent>
              </Select>
            </div>
      
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label>Type</Label>
                <Select type="single" bind:value={mediaType}>
                  <SelectTrigger class="w-full capitalize">{mediaType}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>
      
              <div class="space-y-2">
                <Label>Model</Label>
                <Select type="single" bind:value={model}>
                  <SelectTrigger class="w-full uppercase">{model}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chatgpt">ChatGPT</SelectItem>
                    <SelectItem value="veo">Google Veo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div class="space-y-2">
              <Label>Interval</Label>
              <Select type="single" bind:value={interval}>
                <SelectTrigger class="w-full">{triggerInterval}</SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">Every minute</SelectItem>
                  <SelectItem value="10m">Every 10 minutes</SelectItem>
                  <SelectItem value="1h">Every hour</SelectItem>
                  <SelectItem value="6h">Every 6 hours</SelectItem>
                  <SelectItem value="12h">Every 12 hours</SelectItem>
                  <SelectItem value="1d">Daily</SelectItem>
                  <SelectItem value="1w">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Dialog.Footer>
            <Button 
              variant="outline" 
              onclick={() => open = false}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              onclick={addAutomation}
              disabled={isCreating || !title || !presetId}
            >
              {isCreating ? 'Creating...' : 'Create Workflow'}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>

      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div class="flex-1 relative">
            <Search
              class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
            <Input
              bind:value={searchQuery}
              placeholder="Search workflows by title, description, or preset..."
              class="pl-10 max-w-md"
            />
          </div>
        </div>

        {#if filteredWorkflows.length > 0}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each filteredWorkflows as workflow (workflow.id)}
              <div class="group cursor-pointer">
                <div class="relative rounded-lg overflow-hidden border transition-all hover:border-primary">
                  <div class="p-4">
                    <div class="flex items-start justify-between mb-3">
                      <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-sm truncate">{workflow.title}</h3>
                        <p class="text-xs text-muted-foreground">ID: #{workflow.id}</p>
                      </div>
                      <Badge class={cn("capitalize font-normal text-xs", getStatusColor(workflow.status ?? "pending"))}>
                        {#if workflow.status === 'processing'}
                          <Loader2 size={12} class="mr-1 animate-spin" />
                        {:else if workflow.status === 'completed'}
                          <Check size={12} class="mr-1" />
                        {:else if workflow.status === 'failed'}
                          <X size={12} class="mr-1" />
                        {/if}
                        {workflow.status || 'pending'}
                      </Badge>
                    </div>

                    {#if workflow.description}
                      <p class="text-xs text-muted-foreground line-clamp-2 mb-3">{workflow.description}</p>
                    {/if}

                    <div class="space-y-2">
                      <div class="flex items-center justify-between text-xs">
                        <span class="text-muted-foreground">Preset</span>
                        <span class="font-medium truncate ml-2">{workflow.preset?.name || 'N/A'}</span>
                      </div>
                      <div class="flex items-center justify-between text-xs">
                        <span class="text-muted-foreground">Type</span>
                        <span class="font-medium capitalize">{workflow.mediaType || 'video'}</span>
                      </div>
                      <div class="flex items-center justify-between text-xs">
                        <span class="text-muted-foreground">Model</span>
                        <span class="font-medium uppercase">{workflow.model || 'veo'}</span>
                      </div>
                      <div class="flex items-center justify-between text-xs">
                        <span class="text-muted-foreground">Interval</span>
                        <div class="flex items-center gap-1">
                          <Clock size={12} />
                          <span class="font-medium text-xs">{workflow.interval}</span>
                        </div>
                      </div>
                      <div class="flex items-center justify-between text-xs">
                        <span class="text-muted-foreground">Accounts</span>
                        <span class="font-medium text-xs">{workflow.accounts?.length || 0} connected</span>
                      </div>
                      <div class="flex items-center justify-between text-xs">
                        <span class="text-muted-foreground">Created</span>
                        <span class="font-medium">{new Date(workflow.createdAt || '').toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div class="p-3 border-t flex gap-2">
                    <Button 
                      href="/workflows/{workflow.id}" 
                      variant="outline" 
                      size="sm" 
                      class="flex-1 h-8"
                    >
                      <Pencil size={12} class="mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onclick={() => runWorkflow(workflow.id)}
                      disabled={isRunning}
                      class="flex-1 h-8"
                    >
                      <Play size={12} class="mr-1" />
                      Run
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onclick={() => openDeleteDialog(workflow.id)}
                      class="h-8"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else if searchQuery}
          <div class="text-center py-12">
            <p class="text-muted-foreground">
              No workflows found matching "{searchQuery}"
            </p>
          </div>
        {:else}
          <div class="rounded-lg border border-dashed p-12 text-center">
            <Clock class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p class="text-sm text-muted-foreground mb-4">
              No workflows configured yet.
            </p>
            <Button onclick={() => open = true} class="gap-2">
              <Plus class="h-4 w-4" />
              Create Workflow
            </Button>
          </div>
        {/if}
      </div>
    </main>

    <!-- Delete Confirmation Dialog -->
    <Dialog.Root bind:open={isDeleteDialogOpen}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Delete Workflow</Dialog.Title>
          <Dialog.Description>
            Are you sure you want to delete this workflow? This action cannot be undone.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Button
            variant="outline"
            onclick={() => {
              isDeleteDialogOpen = false;
              workflowToDelete = null;
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
  
