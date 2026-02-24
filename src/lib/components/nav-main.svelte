<script lang="ts">
    import { page } from "$app/state";
    import * as Sidebar from "$lib/components/ui/sidebar/index.js";
    import { cn } from "$lib/utils";
    import { Home, type Icon as LucideIcon } from "lucide-svelte";

    let { items }: { items: { title: string; url: string; icon?: LucideIcon }[] } = $props();
    let path = $derived(page.url.pathname);
</script>

<Sidebar.Content>
    <Sidebar.Group>
        <Sidebar.Menu class="flex flex-col items-center gap-4 py-4">
            
            <Sidebar.MenuItem>
                <a 
                    href="/" 
                    class="flex flex-col items-center transition-all group/item"
                >
                    <div class={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-200",
                        path === "/" 
                            ? "border-sidebar-border bg-sidebar-accent shadow-sm" 
                            : "border-transparent group-hover/item:bg-sidebar-accent"
                    )}>
                        <Home size={24} strokeWidth={1.5} class="text-sidebar-foreground" />
                    </div>
                    <span class={cn(
                        "text-[10px] font-medium transition-colors",
                        path === "/" ? "text-sidebar-foreground" : "text-muted-foreground group-hover/item:text-sidebar-foreground"
                    )}>Home</span>
                </a>
            </Sidebar.MenuItem>

            {#each items as item (item.title)}
                {@const isActive = path === item.url}
                <Sidebar.MenuItem>
                    <a 
                        href={item.url} 
                        class="flex flex-col items-center transition-all group/item"
                    >
                        <div class={cn(
                            "flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-200",
                            isActive 
                                ? "border-sidebar-border bg-sidebar-accent shadow-sm" 
                                : "border-transparent group-hover/item:bg-sidebar-accent"
                        )}>
                            {#if item.icon}
                                <item.icon size={24} strokeWidth={1.5} class="text-sidebar-foreground" />
                            {/if}
                        </div>
                        
                        <span class={cn(
                            "text-[10px] font-medium transition-colors",
                            isActive ? "text-sidebar-foreground" : "text-muted-foreground group-hover/item:text-sidebar-foreground"
                        )}>
                            {item.title}
                        </span>
                    </a>
                </Sidebar.MenuItem>
            {/each}

        </Sidebar.Menu>
    </Sidebar.Group>
</Sidebar.Content>
