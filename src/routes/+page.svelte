<main class="space-y-6 text-sky-100">
  <!-- Top tab bar -->
  <nav
    class="flex items-center gap-4 rounded-full border border-sky-500/60 bg-slate-950/60 px-4 py-2 shadow-[0_0_0_1px_rgba(56,189,248,0.4)]"
  >
    <button
      type="button"
      class="rounded-full border border-sky-400/70 bg-sky-500/15 px-5 py-1.5 text-sm font-medium tracking-wide text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.4)]"
    >
      Video pull
    </button>
    <button
      type="button"
      class="rounded-full border border-sky-500/40 bg-slate-950/40 px-5 py-1.5 text-sm font-medium tracking-wide text-sky-200 hover:bg-sky-500/10 transition-colors"
    >
      Generation Part
    </button>
    <button
      type="button"
      class="ml-auto rounded-full border border-sky-500/40 bg-slate-950/40 px-5 py-1.5 text-sm font-medium tracking-wide text-sky-400/70 hover:bg-sky-500/10 transition-colors"
    >
      <!-- empty tab placeholder -->
    </button>
  </nav>

  <!-- Main board -->
  <section
    class="rounded-[2rem] border border-sky-500/60 bg-slate-950/50 px-5 py-6 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
  >
    <div
      class="flex flex-col gap-5 rounded-[1.75rem] border border-sky-500/40 bg-slate-950/40 px-4 py-4 md:flex-row"
    >
      <!-- Left: channels list -->
      <div
        class="flex-1 rounded-[1.5rem] border border-sky-500/40 bg-slate-950/40 px-4 py-4"
      >
        <h2 class="mb-4 text-sm font-semibold text-sky-200">
          Channels to pull
        </h2>

        <div
          class="flex items-center gap-3 rounded-2xl border border-sky-500/50 bg-slate-950/60 px-4 py-3 text-sm shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
        >
          <span class="font-medium text-sky-100">Pewdiepie</span>

          <span
            class="rounded-full border border-sky-400/70 bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-50"
          >
            30m
          </span>

          <span
            class="rounded-full border border-sky-400/70 bg-slate-950/70 px-3 py-1 text-xs font-medium text-sky-100"
          >
            shorts / videos
          </span>
        </div>
      </div>

      <!-- Right: progress card -->
      <div
        class="flex-1 rounded-[1.5rem] border border-sky-500/40 bg-slate-950/40 px-4 py-4"
      >
        <div
          class="flex h-full items-center justify-center rounded-[1.25rem] border border-sky-500/40 bg-slate-950/60 p-4"
        >
          <div
            class="w-40 rounded-2xl border border-sky-400/70 bg-slate-950/80 px-4 py-2 text-center text-xs font-semibold text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.45)]"
          >
            0 / 100%
          </div>
        </div>
      </div>
    </div>
  </section>
</main>
