<script lang="ts">
	import type { PageData } from './$types';
	import { browser } from '$app/environment';
	import { createTrpcClient } from '$lib/trpc/client';
	import type { RouterOutputs } from '$lib/trpc/types';

	type Task = RouterOutputs['tasks']['list'][number];

	export let data: PageData;

	let tasks: Task[] = data.tasks;
	let title = '';
	let pending = false;
	let error: string | null = null;

	const trpc = browser ? createTrpcClient() : null;

	async function addTask() {
		if (!title.trim() || !trpc) return;
		pending = true;
		error = null;

		try {
			const task = await trpc.tasks.create.mutate({ title: title.trim() });
			tasks = [task, ...tasks];
			title = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create task';
		} finally {
			pending = false;
		}
	}

	async function toggleTask(task: Task) {
		if (!trpc) return;
		const next = !task.is_done;
		const snapshot = [...tasks];
		tasks = tasks.map((t) => (t.id === task.id ? { ...t, is_done: next } : t));
		try {
			await trpc.tasks.toggle.mutate({ id: task.id, isDone: next });
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to toggle task';
			tasks = snapshot;
		}
	}

	async function deleteTask(task: Task) {
		if (!trpc) return;
		const current = tasks;
		tasks = tasks.filter((t) => t.id !== task.id);
		try {
			await trpc.tasks.remove.mutate({ id: task.id });
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete task';
			tasks = current;
		}
	}
</script>

<main>
	<section>
		<h1>Bun + Svelte + Drizzle + tRPC</h1>
		<p>Quick sample for a task tracker wired end-to-end.</p>
	</section>

	<form class="card" on:submit|preventDefault={addTask}>
		<label for="title">New task</label>
		<div class="row">
			<input
				type="text"
				id="title"
				name="title"
				placeholder="Add a task..."
				bind:value={title}
				minlength="3"
				maxlength="140"
				required
			/>
			<button type="submit" disabled={pending || !trpc}>
				{pending ? 'Adding…' : 'Add'}
			</button>
		</div>
		{#if error}
			<p class="error">{error}</p>
		{/if}
		{#if !trpc}
			<p class="hint">tRPC client only runs in the browser.</p>
		{/if}
	</form>

	<section class="card">
		<h2>{tasks.length ? 'Tasks' : 'Nothing yet'}</h2>
		{#if tasks.length}
			<ul>
				{#each tasks as task (task.id)}
					<li>
						<label>
							<input
								type="checkbox"
								checked={task.is_done}
								on:change={() => toggleTask(task)}
								disabled={!trpc}
							/>
							<span class:done={task.is_done}>{task.title}</span>
						</label>
						<button class="ghost" on:click={() => deleteTask(task)} disabled={!trpc}>
							Delete
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p>Add your first task above.</p>
		{/if}
	</section>
</main>

<style>
	main {
		max-width: 640px;
		margin: 4rem auto;
		padding: 0 1rem 4rem;
		font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.card {
		padding: 1.5rem;
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.9);
		box-shadow: 0 20px 45px rgba(0, 0, 0, 0.08);
	}

	.row {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	input {
		flex: 1;
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		border: 1px solid #d1d5db;
		font-size: 1rem;
	}

	button {
		padding: 0.65rem 1.25rem;
		border-radius: 0.75rem;
		border: none;
		background: #2563eb;
		color: white;
		font-weight: 600;
		cursor: pointer;
	}

	button[disabled] {
		opacity: 0.5;
		cursor: not-allowed;
	}

	button.ghost {
		background: transparent;
		color: #ef4444;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 1rem 0 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	span.done {
		text-decoration: line-through;
		color: #9ca3af;
	}

	.error {
		margin-top: 0.75rem;
		color: #b91c1c;
	}

	.hint {
		margin-top: 0.5rem;
		font-size: 0.85rem;
		color: #6b7280;
	}
</style>
