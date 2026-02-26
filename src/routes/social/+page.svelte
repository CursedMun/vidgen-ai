<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import * as Dialog from '$lib/components/ui/dialog';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { createTrpcClient } from '$lib/trpc/client';
    import { IconBrandInstagram, IconBrandYoutube } from "@tabler/icons-svelte";
    import { Plus } from 'lucide-svelte';
    import { onMount } from 'svelte';
    import { toast } from 'svelte-sonner';

    const trpc = createTrpcClient();
  
    let accounts = $state<{ id: number; name: string; expiresAt: string; updatedAt: string | null; instagramBusinessId: string; accessToken: string; }[]>([]);
    let accountsYoutube = $state<{ id: number; name: string; accessToken: string | null; refreshToken: string; expiryDate: number | null; clientId: string | null; }[]>([]);
    let newToken = $state("");
    let accountAlias = $state("");
    let isInstagramDialogOpen = $state(false);
    let isAddingAccount = $state(false);

    async function handleAddYoutube() {
      const authUrlQuery = await trpc.youtube.getAuthUrl.query();
      if (authUrlQuery) {
        window.location.href = authUrlQuery;
      }
    }

    async function addAccount() {
      if (!newToken || !accountAlias) {
        toast.error('Please enter both account name and token');
        return;
      }

      isAddingAccount = true;
      try {
        await trpc.videos.addInstagramAccount.mutate({ 
          shortLivedToken: newToken, 
          name: accountAlias 
        });
        newToken = "";
        accountAlias = "";
        isInstagramDialogOpen = false;
        await loadAccounts();
        toast.success('Instagram account added successfully!');
      } catch (error) {
        console.error('Error adding account:', error);
        toast.error('Failed to add Instagram account');
      } finally {
        isAddingAccount = false;
      }
    }
  
    async function loadAccounts() {
      accounts = await trpc.videos.listInstagramAccounts.query();
      accountsYoutube = await trpc.videos.listYoutubeAccounts.query();
    }
  
    onMount(() => {
      loadAccounts();
    });
  </script>
  
  <main class="container mx-auto flex flex-col py-8 gap-6">
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Social Media Accounts</h1>
        <p class="text-muted-foreground text-sm">
          Manage your connected social media accounts.
        </p>
      </div>

      <Button 
        class="gap-2"
        onclick={() => isInstagramDialogOpen = true}
      >
        <Plus class="h-4 w-4" />
        Add Instagram Account
      </Button>
    </header>

    <!-- Instagram Dialog -->
    <Dialog.Root bind:open={isInstagramDialogOpen}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Add Instagram Account</Dialog.Title>
          <Dialog.Description>
            Connect a new Instagram business account using a Meta access token.
          </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="account-name">Account Name</Label>
            <Input
              id="account-name"
              bind:value={accountAlias}
              placeholder="e.g., My Business Account"
            />
          </div>

          <div class="space-y-2">
            <Label for="access-token">Meta Access Token</Label>
            <Input
              id="access-token"
              bind:value={newToken}
              placeholder="Short-Lived Token"
              type="password"
            />
          </div>
        </div>

        <Dialog.Footer>
          <Button
            variant="outline"
            onclick={() => {
              isInstagramDialogOpen = false;
              newToken = '';
              accountAlias = '';
            }}
            disabled={isAddingAccount}
          >
            Cancel
          </Button>
          <Button 
            onclick={addAccount} 
            disabled={isAddingAccount || !newToken || !accountAlias}
          >
            {isAddingAccount ? 'Adding...' : 'Add Account'}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>

    <div class="space-y-6">
      <!-- Instagram Accounts Section -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <IconBrandInstagram size={24} class="text-pink-500" />
            <h2 class="text-lg font-semibold">Instagram Accounts</h2>
          </div>
        </div>

        {#if accounts.length > 0}
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            {#each accounts as account}
            <div class="group cursor-pointer">
              <div class="relative rounded-lg overflow-hidden border transition-all hover:border-primary">
                <div class="p-4">
                  <Button href="/social/{account.id}" variant="link">
                    <div class="flex items-center gap-3 mb-2">
                      <div class="h-10 w-10 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500 border border-pink-500/20">
                        <IconBrandInstagram size={20} />
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="font-semibold text-sm truncate">{account.name}</p>
                        <p class="text-xs text-muted-foreground truncate">ID: {account.instagramBusinessId}</p>
                      </div>
                    </div>
                  </Button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="rounded-lg border border-dashed p-12 text-center">
            <IconBrandInstagram class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p class="text-sm text-muted-foreground mb-4">
              No Instagram accounts connected yet.
            </p>
            <Button onclick={() => isInstagramDialogOpen = true} class="gap-2">
              <Plus class="h-4 w-4" />
              Add Instagram Account
            </Button>
          </div>
        {/if}
      </div>

      <!-- YouTube Accounts Section -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <IconBrandYoutube size={24} class="text-red-500" />
            <h2 class="text-lg font-semibold">YouTube Channels</h2>
          </div>
          <Button onclick={handleAddYoutube} variant="outline" size="sm" class="gap-2">
            <Plus class="h-4 w-4" />
            Connect Channel
          </Button>
        </div>

        {#if accountsYoutube.length > 0}
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            {#each accountsYoutube as account}
              <div class="group cursor-pointer">
                <div class="relative rounded-lg overflow-hidden border transition-all hover:border-primary">
                  <div class="p-4">
                    <div class="flex items-center gap-3">
                      <div class="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                        <IconBrandYoutube size={20} />
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="font-semibold text-sm truncate">{account.name}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="rounded-lg border border-dashed p-12 text-center">
            <IconBrandYoutube class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p class="text-sm text-muted-foreground mb-4">
              No YouTube channels connected yet.
            </p>
            <Button onclick={handleAddYoutube} variant="outline" class="gap-2">
              <Plus class="h-4 w-4" />
              Connect Channel
            </Button>
          </div>
        {/if}
      </div>
    </div>
  </main>
  