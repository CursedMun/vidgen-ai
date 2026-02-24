<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import AppSidebar from '$lib/components/app-sidebar.svelte';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import SiteHeader from '@/components/site-header.svelte';
  import { ModeWatcher } from 'mode-watcher';
  import '../app.css';

  const { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />

<Sidebar.Provider
  style="--sidebar-width: calc(var(--spacing) * 2 + 75px); --header-height: calc(var(--spacing) * 12);"
>
  <AppSidebar variant="inset" />
  <Sidebar.Inset>
    <SiteHeader />
    <div class="flex flex-1 flex-col px-0 pb-6 pt-4 lg:px-8">
      {@render children?.()}
    </div>
  </Sidebar.Inset>
</Sidebar.Provider>
