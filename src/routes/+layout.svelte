<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import '../app.css';
  import { ModeWatcher } from 'mode-watcher';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import AppSidebar from '$lib/components/app-sidebar.svelte';
  import SiteHeader from '$lib/components/site-header.svelte';

  const { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />

<Sidebar.Provider
  style="--sidebar-width: calc(var(--spacing) * 72); --header-height: calc(var(--spacing) * 12);"
>
  <AppSidebar variant="inset" />
  <Sidebar.Inset>
    <SiteHeader />
    <div class="flex flex-1 flex-col px-4 pb-6 pt-4 lg:px-8">
      {@render children?.()}
    </div>
  </Sidebar.Inset>
</Sidebar.Provider>
