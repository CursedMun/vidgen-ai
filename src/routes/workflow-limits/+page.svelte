<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Select from '$lib/components/ui/select';
  import { createTrpcClient } from '$lib/trpc/client';
  import { BarChart3, Edit, Plus, Trash2 } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';

  const trpc = createTrpcClient();

  type WorkflowJobPerDay = {
    id: number;
    type: string;
    count: number;
    createdAt: Date;
    updatedAt: Date;
  };

  let jobs = $state<WorkflowJobPerDay[]>([]);
  let isCreateDialogOpen = $state(false);
  let isEditDialogOpen = $state(false);
  let isDeleteDialogOpen = $state(false);
  let selectedJob = $state<WorkflowJobPerDay | null>(null);
  let selectedType = $state<string>('video_ideas_fetching');
  let count = $state<number>(0);
  let isCreating = $state(false);
  let isEditing = $state(false);
  let isDeleting = $state(false);
  let isResetting = $state(false);

  const workflowTypes = [
    { value: 'video_ideas_fetching', label: 'Video Ideas Fetching' },
    { value: 'video_generation', label: 'Video Generation' },
    { value: 'video_publish_with_sound', label: 'Video Publish with Sound' },
    { value: 'video_publish', label: 'Video Publish' },
    { value: 'image_generation', label: 'Image Generation' },
    { value: 'image_publish', label: 'Image Publish' },
  ];

  function formatTypeName(type: string): string {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      video_ideas_fetching: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      video_generation: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      video_publish_with_sound: 'bg-green-500/10 text-green-500 border-green-500/20',
      video_publish: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      image_generation: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
      image_publish: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    };
    return colors[type] || 'bg-muted text-muted-foreground border-muted';
  }

  function openCreateDialog() {
    selectedType = 'video_ideas_fetching';
    count = 0;
    isCreateDialogOpen = true;
  }

  function openEditDialog(job: WorkflowJobPerDay) {
    selectedJob = job;
    selectedType = job.type;
    count = job.count;
    isEditDialogOpen = true;
  }

  function openDeleteDialog(job: WorkflowJobPerDay) {
    selectedJob = job;
    isDeleteDialogOpen = true;
  }

  async function createJob() {
    if (count < 0) {
      toast.error('Count must be non-negative');
      return;
    }

    isCreating = true;
    try {
      await trpc.workflowJobsPerDay.create.mutate({
        type: selectedType as any,
        count,
      });

      isCreateDialogOpen = false;
      selectedType = 'video_ideas_fetching';
      count = 0;
      await loadJobs();
      toast.success('Workflow job counter created!');
    } catch (error) {
      console.error('Error creating job counter:', error);
      toast.error('Failed to create job counter');
    } finally {
      isCreating = false;
    }
  }

  async function updateJob() {
    if (!selectedJob) return;

    if (count < 0) {
      toast.error('Count must be non-negative');
      return;
    }

    isEditing = true;
    try {
      await trpc.workflowJobsPerDay.update.mutate({
        id: selectedJob.id,
        count,
      });

      isEditDialogOpen = false;
      selectedJob = null;
      await loadJobs();
      toast.success('Counter updated!');
    } catch (error) {
      console.error('Error updating counter:', error);
      toast.error('Failed to update counter');
    } finally {
      isEditing = false;
    }
  }

  async function deleteJob() {
    if (!selectedJob) return;

    isDeleting = true;
    try {
      await trpc.workflowJobsPerDay.delete.mutate({ id: selectedJob.id });

      isDeleteDialogOpen = false;
      selectedJob = null;
      await loadJobs();
      toast.success('Counter deleted');
    } catch (error) {
      console.error('Error deleting counter:', error);
      toast.error('Failed to delete counter');
    } finally {
      isDeleting = false;
    }
  }

  async function resetAllCounts() {
    isResetting = true;
    try {
      await trpc.workflowJobsPerDay.resetAllCounts.mutate();
      await loadJobs();
      toast.success('All counters reset to 0');
    } catch (error) {
      console.error('Error resetting counters:', error);
      toast.error('Failed to reset counters');
    } finally {
      isResetting = false;
    }
  }

  async function loadJobs() {
    jobs = await trpc.workflowJobsPerDay.list.query();
  }

  onMount(() => {
    loadJobs();
  });
</script>

<main class="container mx-auto flex flex-col py-8 gap-6">
  <header class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-foreground">Workflow Job Limits</h1>
      <p class="text-muted-foreground text-sm">
        Set limits per job
      </p>
    </div>

    <div class="flex gap-2">
  
      <Button class="gap-2" onclick={openCreateDialog}>
        <Plus class="h-4 w-4" />
        Add Counter
      </Button>
    </div>
  </header>

  <!-- Create Dialog -->
  <Dialog.Root bind:open={isCreateDialogOpen}>
    <Dialog.Content class="overflow-x-hidden">
      <Dialog.Header>
        <Dialog.Title>Add Workflow Job Counter</Dialog.Title>
        <Dialog.Description>
          Create a new counter for tracking daily workflow jobs.
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label for="create-type">Workflow Type</Label>
          <Select.Root type="single" bind:value={selectedType}>
            <Select.Trigger id="create-type" class="w-full">
              <span data-slot="select-value">
                {formatTypeName(selectedType)}
              </span>
            </Select.Trigger>
            <Select.Content class="rounded-xl">
              {#each workflowTypes as type}
                <Select.Item value={type.value} class="rounded-lg">{type.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <div class="space-y-2">
          <Label for="create-count">Initial Count</Label>
          <Input
            id="create-count"
            type="number"
            min="0"
            bind:value={count}
            placeholder="0"
          />
        </div>
      </div>

      <Dialog.Footer>
        <Button
          variant="outline"
          onclick={() => {
            isCreateDialogOpen = false;
            selectedType = 'video_ideas_fetching';
            count = 0;
          }}
          disabled={isCreating}
        >
          Cancel
        </Button>
        <Button onclick={createJob} disabled={isCreating}>
          {isCreating ? 'Creating...' : 'Create Counter'}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <!-- Edit Dialog -->
  <Dialog.Root bind:open={isEditDialogOpen}>
    <Dialog.Content class="overflow-x-hidden">
      <Dialog.Header>
        <Dialog.Title>Edit Job Counter</Dialog.Title>
        <Dialog.Description>Update the count for this workflow type.</Dialog.Description>
      </Dialog.Header>

      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label>Workflow Type</Label>
          <Input value={formatTypeName(selectedType)} disabled />
        </div>

        <div class="space-y-2">
          <Label for="edit-count">Count</Label>
          <Input
            id="edit-count"
            type="number"
            min="0"
            bind:value={count}
            placeholder="0"
          />
        </div>
      </div>

      <Dialog.Footer>
        <Button
          variant="outline"
          onclick={() => {
            isEditDialogOpen = false;
            selectedJob = null;
          }}
          disabled={isEditing}
        >
          Cancel
        </Button>
        <Button onclick={updateJob} disabled={isEditing}>
          {isEditing ? 'Updating...' : 'Update Counter'}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <!-- Delete Dialog -->
  <Dialog.Root bind:open={isDeleteDialogOpen}>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Delete Counter</Dialog.Title>
        <Dialog.Description>
          Are you sure you want to delete this workflow job counter?
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer>
        <Button
          variant="outline"
          onclick={() => {
            isDeleteDialogOpen = false;
            selectedJob = null;
          }}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button variant="destructive" onclick={deleteJob} disabled={isDeleting}>
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <div class="space-y-6">
    {#if jobs.length > 0}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each jobs as job}
          <Card.Root>
            <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
              <Card.Title class="text-sm font-medium">
                {formatTypeName(job.type)}
              </Card.Title>
              <div class={`h-8 w-8 rounded-full flex items-center justify-center ${getTypeColor(job.type)}`}>
                <BarChart3 class="h-4 w-4" />
              </div>
            </Card.Header>
            <Card.Content>
              <div class="text-2xl font-bold">{job.count}</div>
              <p class="text-xs text-muted-foreground mt-1">
                Updated {new Date(job.updatedAt).toLocaleDateString()}
              </p>
              <div class="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  class="flex-1"
                  onclick={() => openEditDialog(job)}
                >
                  <Edit class="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onclick={() => openDeleteDialog(job)}
                >
                  <Trash2 class="h-3 w-3" />
                </Button>
              </div>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>
    {:else}
      <div class="rounded-lg border border-dashed p-12 text-center">
        <BarChart3 class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p class="text-sm text-muted-foreground mb-4">
          No workflow job counters created yet.
        </p>
        <Button onclick={openCreateDialog} class="gap-2">
          <Plus class="h-4 w-4" />
          Add Counter
        </Button>
      </div>
    {/if}
  </div>
</main>
