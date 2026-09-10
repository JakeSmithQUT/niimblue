<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { activeView } from "$lib/view";
  import { labelProps } from "$lib/label";
  import { DEFAULT_LABEL } from "$lib/label";
  import { scene, undo, redo } from "$lib/engine/scene";
  import { saveCurrentLabel, openLabelFile } from "$lib/library";
  import { toast } from "$lib/toast";
  import PrinterBar from "./components/PrinterBar.svelte";
  import Sidebar from "./components/Sidebar.svelte";
  import ToastStack from "./components/ToastStack.svelte";
  import EditorCanvas from "./components/EditorCanvas.svelte";
  import PropertiesPanel from "./components/PropertiesPanel.svelte";
  import LayersPanel from "./components/LayersPanel.svelte";
  import LibraryView from "./components/LibraryView.svelte";
  import PrinterTools from "./components/PrinterTools.svelte";
  import PrintDialog from "./components/PrintDialog.svelte";

  let printOpen = $state(false);

  const newLabel = () => {
    labelProps.set(structuredClone(DEFAULT_LABEL));
    scene.set({ nodes: [], selectedId: undefined });
    activeView.set("design");
    toast("New label", "info");
  };

  const onSave = async () => {
    const name = prompt("Label name", "Untitled");
    if (!name) return;
    await saveCurrentLabel(name);
    toast(`Saved ${name}`, "success");
  };

  const onMenuAction = (action: string) => {
    switch (action) {
      case "new":
        newLabel();
        break;
      case "open":
        openLabelFile();
        break;
      case "save":
        onSave();
        break;
      case "print":
        printOpen = true;
        break;
      case "undo":
        undo();
        break;
      case "redo":
        redo();
        break;
    }
  };

  let offMenu: (() => void) | undefined;
  onMount(() => {
    offMenu = window.electronAPI?.onMenuAction(onMenuAction);
  });
  onDestroy(() => offMenu?.());
</script>

<div class="flex h-full w-full flex-col">
  <PrinterBar />

  <div class="flex min-h-0 flex-1">
    <Sidebar />

    <main class="min-w-0 flex-1 overflow-hidden bg-surface-1">
      {#if $activeView === "design"}
        <EditorCanvas onPrint={() => (printOpen = true)} />
      {:else if $activeView === "library"}
        <LibraryView />
      {:else if $activeView === "tools"}
        <PrinterTools />
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

<PrintDialog bind:show={printOpen} />
