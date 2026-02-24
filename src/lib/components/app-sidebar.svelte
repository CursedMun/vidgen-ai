<script lang="ts">
	import DashboardIcon from "@tabler/icons-svelte/icons/dashboard";
	import HelpIcon from "@tabler/icons-svelte/icons/help";
	import InnerShadowTopIcon from "@tabler/icons-svelte/icons/inner-shadow-top";
	import SearchIcon from "@tabler/icons-svelte/icons/search";
	import SettingsIcon from "@tabler/icons-svelte/icons/settings";
	import NavMain from "./nav-main.svelte";
	import NavUser from "./nav-user.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import type { ComponentProps } from "svelte";
  import { IconBrandInstagram, IconFileDescriptionFilled, IconPresentationAnalytics } from "@tabler/icons-svelte";

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

<!-- <Sidebar.Root collapsible="offcanvas" {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton class="data-[slot=sidebar-menu-button]:!p-1.5">
					{#snippet child({ props })}
						<a href="##" {...props}>
							<InnerShadowTopIcon class="!size-5" />
							<span class="text-base font-semibold">Acme Inc.</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain items={data.navMain} />
		 <NavSecondary items={data.navSecondary} class="mt-auto" /> 
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser user={data.user} />
	</Sidebar.Footer>
</Sidebar.Root> -->
<Sidebar.Root 
    collapsible="offcanvas"
    class="w-[82px] border-r border-zinc-200 bg-white" 
    {...restProps}
>
    <Sidebar.Header class="flex items-center justify-center py-6 bg-white">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-lg">
            <InnerShadowTopIcon class="size-6" />
        </div>
    </Sidebar.Header>

    <Sidebar.Content class=" bg-white overflow-x-hidden">
        <NavMain items={data.navMain} />
    </Sidebar.Content>
</Sidebar.Root>
