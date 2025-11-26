<script lang="ts">
  import favicon from "$lib/assets/favicon.svg"
  import "../app.css"

  const { children } = $props()
</script>

<svelte:head>
  <link rel="icon" href={favicon}>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-6">
  <div class="w-full max-w-2xl">{@render children()}</div>
</div>
