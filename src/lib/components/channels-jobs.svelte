<script lang="ts">
  import { invalidate } from '$app/navigation';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { createTrpcClient } from '$lib/trpc/client';

  let {
    channels,
  }: { channels: Awaited<ReturnType<typeof trpc.channels.list.query>> } =
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
        fetchIntervalMinutes: newChannelInterval,
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

  const formatTimestamp = (value: string | null) => {
    if (!value) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  };
</script>

<div class="grid gap-6">
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
</div>
