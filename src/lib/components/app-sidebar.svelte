<script lang="ts">
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import HelpIcon from "@tabler/icons-svelte/icons/help";
	import InnerShadowTopIcon from "@tabler/icons-svelte/icons/inner-shadow-top";
	import SearchIcon from "@tabler/icons-svelte/icons/search";
	import SettingsIcon from "@tabler/icons-svelte/icons/settings";
	import type { ComponentProps } from "svelte";
	import NavMain from "./nav-main.svelte";
  import { IconAutomation, IconBrandInstagram, IconFileDescriptionFilled, IconPresentationAnalytics } from "@tabler/icons-svelte";

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
				icon: IconPresentationAnalytics,
			},
			{
				title: "Automation",
				url: "/automation",
				icon: IconAutomation,
			},
			{
				title: "Social",
				url: "/social",
				icon: IconBrandInstagram,
			},
			{
				title: "Transcriptions",
				url: "/transcriptions",
				icon: IconFileDescriptionFilled,
			},
		],
		navClouds: [],
		navSecondary: [
			{
				title: "Settings",
				url: "#",
				icon: SettingsIcon,
			},
			{
				title: "Get Help",
				url: "#",
				icon: HelpIcon,
			},
			{
				title: "Search",
				url: "#",
				icon: SearchIcon,
			},
		],
		documents: [],
	};

	let { ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();
</script>


<Sidebar.Root 
    collapsible="offcanvas"
    class="w-[82px] border-r border-sidebar-border bg-sidebar" 
    {...restProps}
>
    <Sidebar.Header class="flex items-center justify-center py-6 bg-sidebar">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg">
            <InnerShadowTopIcon class="size-6" />
        </div>
    </Sidebar.Header>

    <Sidebar.Content class="bg-sidebar overflow-x-hidden">
        <NavMain items={data.navMain} />
    </Sidebar.Content>
</Sidebar.Root>
