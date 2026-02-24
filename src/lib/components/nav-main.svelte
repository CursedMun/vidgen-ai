<script lang="ts">
    import { page } from "$app/state";
    import * as Sidebar from "$lib/components/ui/sidebar/index.js";
    import { IconLayoutDashboard, type Icon } from "@tabler/icons-svelte";
    import { cn } from "$lib/utils";

    let { items }: { items: { title: string; url: string; icon?: Icon }[] } = $props();
    let path = $derived(page.url.pathname);
</script>

<Sidebar.Content class="bg-white">
    <Sidebar.Group>
        <Sidebar.Menu class="flex flex-col items-center gap-4 py-4">
            
            <Sidebar.MenuItem>
                <a 
                    href="/" 
                    class="flex flex-col items-center group transition-all"
                >
                    <div class={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-200",
                        path === "/" 
                            ? "border-zinc-100 bg-zinc-50 shadow-sm" 
                            : "border-transparent group-hover:bg-zinc-50"
                    )}>
                        <IconLayoutDashboard size={24} stroke={1.5} class="text-zinc-900" />
                    </div>
                    <span class="text-[10px] font-medium text-zinc-600">Dashboard</span>
                </a>
            </Sidebar.MenuItem>

            {#each items as item (item.title)}
                {@const isActive = path === item.url}
                <Sidebar.MenuItem>
                    <a 
                        href={item.url} 
                        class="flex flex-col items-center group transition-all"
                    >
                        <div class={cn(
                            "flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-200",
                            isActive 
                                ? "border-zinc-100 bg-zinc-50 shadow-sm" 
                                : "border-transparent group-hover:bg-zinc-50"
                        )}>
                            {#if item.icon}
                                <item.icon size={24} stroke={1.5} class="text-zinc-900" />
                            {/if}
                        </div>
                        
                        <span class={cn(
                            "text-[10px] font-medium transition-colors",
                            isActive ? "text-zinc-900" : "text-zinc-500 group-hover:text-zinc-800"
                        )}>
                            {item.title}
                        </span>
                    </a>
                </Sidebar.MenuItem>
            {/each}

        </Sidebar.Menu>
    </Sidebar.Group>
</Sidebar.Content>
