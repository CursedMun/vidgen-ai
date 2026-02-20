// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	var __automation_worker_running: NodeJS.Timeout | undefined;
  	var __worker: boolean | undefined;
	namespace App {
		// interface Error {}
		// interface Locals {}
		interface Locals {
			createContext: (event: import('@sveltejs/kit').RequestEvent) => Promise<TApp>;
		  }
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export { };
