<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Command from '$lib/components/ui/command';
  import * as Popover from '$lib/components/ui/popover';
  import { cn } from '$lib/utils';
  import { Check, ChevronsUpDown } from 'lucide-svelte';

  interface Props {
    prompts: Array<{ id: number; title: string; content: string }>;
    value: string | undefined;
    placeholder?: string;
    onValueChange?: (value: string | undefined) => void;
  }

  let { prompts, value = $bindable(), placeholder = 'Select a prompt' }: Props = $props();

  let open = $state(false);
  let searchValue = $state('');

  let filteredPrompts = $derived(
    prompts.filter((prompt) =>
      prompt.title.toLowerCase().includes(searchValue.toLowerCase())
    )
  );

  function selectPrompt(promptId: string) {
    value = promptId === value ? undefined : promptId;
    open = false;
    searchValue = '';
  }

  let selectedPrompt = $derived(
    value ? prompts.find((p) => p.id.toString() === value) : null
  );
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      class="w-full justify-between"
    >
      <span class="truncate">
        {selectedPrompt?.title || placeholder}
      </span>
      <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  </Popover.Trigger>
  <Popover.Content class="w-full p-0" align="start">
    <Command.Root shouldFilter={false}>
      <Command.Input
        placeholder="Search prompts..."
        bind:value={searchValue}
      />
      <Command.Empty>No prompts found.</Command.Empty>
      <Command.Group class="max-h-64 overflow-auto">
        {#each filteredPrompts as prompt}
          <Command.Item
            value={prompt.title}
            onSelect={() => selectPrompt(prompt.id.toString())}
          >
            <Check
              class={cn(
                'mr-2 h-4 w-4',
                value === prompt.id.toString() ? 'opacity-100' : 'opacity-0'
              )}
            />
            {prompt.title}
          </Command.Item>
        {/each}
      </Command.Group>
    </Command.Root>
  </Popover.Content>
</Popover.Root>
