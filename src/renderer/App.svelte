<script lang="ts">
  import { activeView } from "$lib/view";
  import PrinterBar from "./components/PrinterBar.svelte";
  import Sidebar from "./components/Sidebar.svelte";
  import ToastStack from "./components/ToastStack.svelte";
  import EditorCanvas from "./components/EditorCanvas.svelte";
  import PropertiesPanel from "./components/PropertiesPanel.svelte";
  import LayersPanel from "./components/LayersPanel.svelte";
  import LibraryView from "./components/LibraryView.svelte";
</script>

<div class="flex h-full w-full flex-col">
  <PrinterBar />

  <div class="flex min-h-0 flex-1">
    <Sidebar />

    <main class="min-w-0 flex-1 overflow-hidden bg-surface-1">
      {#if $activeView === "design"}
        <EditorCanvas />
      {:else if $activeView === "library"}
        <LibraryView />
      {:else}
        <div class="flex h-full items-center justify-center text-muted">
          Settings land in phase 7.
        </div>
      {/if}
    </main>

    {#if $activeView === "design"}
      <aside class="flex shrink-0 flex-col">
        <PropertiesPanel />
        <LayersPanel />
      </aside>
    {/if}
  </div>
</div>

<ToastStack />
