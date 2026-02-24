<script lang="ts">
    import { page } from "$app/state";
    import * as Sidebar from "$lib/components/ui/sidebar/index.js";
    import { cn } from "$lib/utils";
    import { IconLayoutDashboard, type Icon } from "@tabler/icons-svelte";

    let { items }: { items: { title: string; url: string; icon?: Icon }[] } = $props();
    let path = $derived(page.url.pathname);
</script>

<Sidebar.Content>
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
                            ? "border-sidebar-border bg-sidebar-accent shadow-sm" 
                            : "border-transparent group-hover:bg-sidebar-accent"
                    )}>
                        <IconLayoutDashboard size={24} stroke={1.5} class="text-sidebar-foreground" />
                    </div>
                    <span class="text-[10px] font-medium text-sidebar-foreground">Dashboard</span>
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
                                ? "border-sidebar-border bg-sidebar-accent shadow-sm" 
                                : "border-transparent group-hover:bg-sidebar-accent"
                        )}>
                            {#if item.icon}
                                <item.icon size={24} stroke={1.5} class="text-sidebar-foreground" />
                            {/if}
                        </div>
                        
                        <span class={cn(
                            "text-[10px] font-medium transition-colors",
                            isActive ? "text-sidebar-foreground" : "text-muted-foreground group-hover:text-sidebar-foreground"
                        )}>
                            {item.title}
                        </span>
                    </a>
                </Sidebar.MenuItem>
            {/each}

        </Sidebar.Menu>
    </Sidebar.Group>
</Sidebar.Content>
