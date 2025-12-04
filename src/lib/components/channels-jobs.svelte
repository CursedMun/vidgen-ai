<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Badge } from '$lib/components/ui/badge';
  import * as Card from '$lib/components/ui/card';
  import { createTrpcClient } from '$lib/trpc/client';
  import { invalidate } from '$app/navigation';

  type Channel = {
    id: number;
    channel_name: string;
    channel_id: string;
    fetch_interval_minutes: number;
    is_active: boolean;
    last_fetched_at: string | null;
    created_at: string;
  };

  type ScheduledJob = {
    id: number;
    channel_id: number | null;
    video_url: string;
    video_id: string | null;
    thumbnail_url: string | null;
    status: string;
    error_message: string | null;
    transcript: string | null;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
  };

  let { channels, jobs }: { channels: Channel[]; jobs: ScheduledJob[] } =
    $props();

  const trpc = createTrpcClient();

  // Add channel form
  let newChannelName = $state('');
  let newChannelInterval = $state(30);
  let isAddingChannel = $state(false);

  async function addChannel() {
    if (!newChannelName.trim()) return;

    isAddingChannel = true;
    try {
      await trpc.channels.create.mutate({
        channelName: newChannelName,
        fetchIntervalMinutes: newChannelInterval
      });
      newChannelName = '';
      newChannelInterval = 30;
      await invalidate('app:data');
    } catch (error) {
      console.error('Error adding channel:', error);
      alert(error instanceof Error ? error.message : 'Failed to add channel');
    } finally {
      isAddingChannel = false;
    }
  }

  async function toggleChannel(id: number, isActive: boolean) {
    try {
      await trpc.channels.toggle.mutate({ id, isActive });
      await invalidate('app:data');
    } catch (error) {
      console.error('Error toggling channel:', error);
    }
  }

  async function removeChannel(id: number) {
    if (!confirm('Are you sure you want to remove this channel?')) return;

    try {
      await trpc.channels.remove.mutate({ id });
      await invalidate('app:data');
    } catch (error) {
      console.error('Error removing channel:', error);
    }
  }

  async function retryJob(id: number) {
    try {
      await trpc.jobs.retry.mutate({ id });
      await invalidate('app:data');
    } catch (error) {
      console.error('Error retrying job:', error);
    }
  }

  async function removeJob(id: number) {
    try {
      await trpc.jobs.remove.mutate({ id });
      await invalidate('app:data');
    } catch (error) {
      console.error('Error removing job:', error);
    }
  }

  const formatTimestamp = (value: string | null) => {
    if (!value) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };
</script>

<div class="grid gap-6 lg:grid-cols-2">
  <!-- Channels Management -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Monitored Channels</Card.Title>
      <Card.Description>
        Add YouTube channels to automatically fetch their latest videos
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <!-- Add Channel Form -->
      <div class="space-y-3 rounded-lg border p-4 bg-muted/50">
        <div class="space-y-2">
          <Label for="channelName">Channel Name</Label>
          <Input
            id="channelName"
            bind:value={newChannelName}
            placeholder="e.g., DevSoutinho"
            disabled={isAddingChannel}
          />
        </div>
        <div class="space-y-2">
          <Label for="interval">Fetch Interval (minutes)</Label>
          <Input
            id="interval"
            type="number"
            bind:value={newChannelInterval}
            min="5"
            disabled={isAddingChannel}
          />
        </div>
        <Button onclick={addChannel} disabled={isAddingChannel} class="w-full">
          {isAddingChannel ? 'Adding...' : 'Add Channel'}
        </Button>
      </div>

      <!-- Channels List -->
      <div class="space-y-2">
        {#each channels as channel}
          <div
            class="flex items-center justify-between rounded-lg border p-3 bg-card"
          >
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{channel.channel_name}</p>
              <p class="text-xs text-muted-foreground">
                Every {channel.fetch_interval_minutes}m
                {#if channel.last_fetched_at}
                  · Last: {formatTimestamp(channel.last_fetched_at)}
                {/if}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <Badge variant={channel.is_active ? 'default' : 'secondary'}>
                {channel.is_active ? 'Active' : 'Paused'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onclick={() => toggleChannel(channel.id, !channel.is_active)}
              >
                {channel.is_active ? 'Pause' : 'Resume'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onclick={() => removeChannel(channel.id)}
              >
                Remove
              </Button>
            </div>
          </div>
        {:else}
          <p class="text-center text-sm text-muted-foreground py-4">
            No channels added yet
          </p>
        {/each}
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Scheduled Jobs -->
  <Card.Root class="flex flex-col min-h-0">
    <Card.Header class="flex-none">
      <div class="flex items-center justify-between">
        <div>
          <Card.Title>Scheduled Jobs</Card.Title>
          <Card.Description>Videos being processed or queued</Card.Description>
        </div>
        <Badge variant="secondary">{jobs.length}</Badge>
      </div>
    </Card.Header>
    <Card.Content class="flex-1 overflow-hidden">
      <div class="h-full space-y-2 overflow-y-auto pr-2">
        {#each jobs as job}
          <div class="rounded-lg border p-3 bg-card space-y-2">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <a
                  href={job.video_url}
                  target="_blank"
                  rel="noreferrer"
                  class="text-sm font-medium hover:underline overflow-wrap-anywhere"
                >
                  {job.video_url}
                </a>
                <p class="text-xs text-muted-foreground mt-1">
                  Scheduled: {formatTimestamp(job.created_at)}
                </p>
              </div>
              <Badge variant={getStatusColor(job.status)}>
                {job.status}
              </Badge>
            </div>

            {#if job.error_message}
              <p class="text-xs text-destructive">{job.error_message}</p>
            {/if}

            <div class="flex gap-2">
              {#if job.status === 'failed'}
                <Button
                  size="sm"
                  variant="outline"
                  onclick={() => retryJob(job.id)}
                >
                  Retry
                </Button>
              {/if}
              <Button
                size="sm"
                variant="ghost"
                onclick={() => removeJob(job.id)}
              >
                Remove
              </Button>
            </div>
          </div>
        {:else}
          <p class="text-center text-sm text-muted-foreground py-8">
            No scheduled jobs
          </p>
        {/each}
      </div>
    </Card.Content>
  </Card.Root>
</div>
