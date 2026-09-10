<script lang="ts">
  import { onMount } from "svelte";
  import { library, refreshLibrary, loadFromData, deleteLibraryEntry } from "$lib/library";
  import { activeView } from "$lib/view";

  let search = $state("");

  onMount(refreshLibrary);

  const filtered = () => {
    const q = search.toLowerCase();
    return $library.filter((e) => e.name.toLowerCase().includes(q));
  };

  const open = async (path: string) => {
    const api = (window as any).electronAPI;
    if (!api?.loadLibraryFile) return;
    const raw = await api.loadLibraryFile(path);
    if (raw) loadFromData(raw, path);
    activeView.set("design");
  };

  const remove = async (path: string, e: MouseEvent) => {
    e.stopPropagation();
    await deleteLibraryEntry(path);
  };
</script>

<div class="flex h-full flex-col bg-surface-1">
  <div class="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
    <h2 class="text-sm font-medium">Library</h2>
    <span class="text-muted">{$library.length} labels</span>
    <div class="ml-auto">
      <input
        class="rounded-md border border-border bg-surface-2 px-2 py-1 text-sm"
        placeholder="Search..."
        bind:value={search}
      />
    </div>
    <button class="lib-btn" onclick={refreshLibrary} title="Refresh">
      <span class="material-symbols-rounded text-[18px]">refresh</span>
    </button>
  </div>

  <div class="flex-1 overflow-y-auto p-4">
    {#if filtered().length === 0}
      <div class="flex h-full items-center justify-center text-muted">
        {#if $library.length === 0}
          No saved labels. Save one from the design view.
        {:else}
          No matches.
        {/if}
      </div>
    {:else}
      <div class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
        {#each filtered() as entry (entry.path)}
          <div
            role="button"
            tabindex="0"
            class="group flex flex-col gap-2 rounded-lg border border-border bg-surface-2 p-3 transition-colors hover:border-accent/50"
            onclick={() => open(entry.path)}
            onkeydown={(e) => e.key === "Enter" && open(entry.path)}
          >
            <div class="flex aspect-square items-center justify-center rounded-md bg-white text-muted">
              <span class="material-symbols-rounded text-[32px] text-surface-3">label</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="flex-1 truncate text-sm">{entry.name}</span>
              <button class="opacity-0 group-hover:opacity-100" title="Delete" onclick={(e) => remove(entry.path, e)}>
                <span class="material-symbols-rounded text-[16px] text-danger">delete</span>
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .lib-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    width: 32px;
    border-radius: 6px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-muted);
    cursor: pointer;
  }
  .lib-btn:hover {
    color: #fff;
    background: var(--color-surface-3);
  }
</style>
