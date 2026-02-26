<script lang="ts">
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { BarChart3, HelpCircle, Instagram, Layers, LineChart, Link2, MessageSquare, Search, Settings, Wrench, Zap } from "lucide-svelte";
	import type { ComponentProps } from "svelte";
	import NavMain from "./nav-main.svelte";

	const data = {
		user: {
			name: "shadcn",
			email: "m@example.com",
			avatar: "/avatars/shadcn.jpg",
		},
		navMain: [
			{
				title: "Presets",
				url: "/presets",
				icon: BarChart3,
			},
			{
				title: "Prompts",
				url: "/prompts",
				icon: MessageSquare,
			},
			{
				title: "Sources",
				url: "/sources",
				icon: Link2,
			},
			{
				title: "Workflows",
				url: "/workflows",
				icon: Zap,
			},
			{
				title: "Workflow Limits",
				url: "/workflow-limits",
				icon: LineChart,
			},
			{
				title: "Social",
				url: "/social",
				icon: Instagram,
			},
			{
				title: "Tools",
				url: "/tools",
				icon: Wrench,
			},
		],
		navClouds: [],
		navSecondary: [
			{
				title: "Settings",
				url: "#",
				icon: Settings,
			},
			{
				title: "Get Help",
				url: "#",
				icon: HelpCircle,
			},
			{
				title: "Search",
				url: "#",
				icon: Search,
			},
		],
		documents: [],
	};

	let { ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();
</script>


<Sidebar.Root 
    collapsible="offcanvas"
    class=" bg-background" 
    {...restProps}
>
    <Sidebar.Header class="h-(--header-height) flex items-center justify-center bg-background  border-sidebar-border">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl text-sidebar-primary-foreground shadow-lg">
            <Layers class="size-6" />
        </div>
    </Sidebar.Header>

    <Sidebar.Content class="bg-background">
        <NavMain items={data.navMain} />
    </Sidebar.Content>
</Sidebar.Root>
