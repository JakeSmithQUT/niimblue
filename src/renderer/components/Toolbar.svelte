<script lang="ts">
  import type { NodeKind } from "$lib/engine/types";
  import { kindLabel } from "$lib/engine/types";
  import { saveCurrentLabel, openLabelFile } from "$lib/library";
  import { toast } from "$lib/toast";

  let {
    onadd,
    onAddImage,
    onPrint,
    zoom,
    onZoomIn,
    onZoomOut,
    onZoomFit,
  }: {
    onadd: (kind: NodeKind) => void;
    onAddImage: () => void;
    onPrint: () => void;
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomFit: () => void;
  } = $props();

  const onSave = async () => {
    const name = prompt("Label name", "Untitled");
    if (!name) return;
    await saveCurrentLabel(name);
    toast(`Saved ${name}`, "success");
  };

  const onOpen = async () => {
    await openLabelFile();
  };

  const tools: { kind: NodeKind; icon: string }[] = [
    { kind: "text", icon: "title" },
    { kind: "rect", icon: "rectangle" },
    { kind: "ellipse", icon: "circle" },
    { kind: "line", icon: "remove" },
    { kind: "qrcode", icon: "qr_code" },
    { kind: "barcode", icon: "barcode" },
    { kind: "aruco", icon: "grid_on" },
  ];
  const imageTool = { kind: "image", icon: "image" } as const;
</script>

<div
  class="flex shrink-0 items-center gap-1 border-b border-border bg-surface-1 px-3 py-1.5"
>
  <button class="file-btn" onclick={onOpen} title="Open">
    <span class="material-symbols-rounded text-[20px]">folder_open</span>
  </button>
  <button class="file-btn" onclick={onSave} title="Save">
    <span class="material-symbols-rounded text-[20px]">save</span>
  </button>
  <button class="print-btn" onclick={onPrint} title="Print">
    <span class="material-symbols-rounded text-[20px]">print</span>
  </button>

  <div class="mx-1 h-6 w-px bg-border"></div>

  {#each tools as t (t.kind)}
    <button
      class="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-white"
      title={`Add ${kindLabel[t.kind]}`}
      onclick={() => onadd(t.kind)}
    >
      <span class="material-symbols-rounded text-[20px]">{t.icon}</span>
    </button>
  {/each}
  <button
    class="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-white"
    title={`Add ${kindLabel[imageTool.kind]}`}
    onclick={onAddImage}
  >
    <span class="material-symbols-rounded text-[20px]">{imageTool.icon}</span>
  </button>

  <div class="ml-auto flex items-center gap-1 text-sm text-muted">
    <button class="zoom-btn" onclick={onZoomOut} title="Zoom out">
      <span class="material-symbols-rounded text-[20px]">remove</span>
    </button>
    <span class="w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
    <button class="zoom-btn" onclick={onZoomIn} title="Zoom in">
      <span class="material-symbols-rounded text-[20px]">add</span>
    </button>
    <button class="zoom-btn" onclick={onZoomFit} title="Fit to screen">
      <span class="material-symbols-rounded text-[20px]">fit_screen</span>
    </button>
  </div>
</div>

<style>
  .zoom-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    width: 32px;
    border-radius: 6px;
    color: var(--color-muted);
    cursor: pointer;
  }
  .zoom-btn:hover {
    background: var(--color-surface-2);
    color: #fff;
  }
  .file-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    width: 32px;
    border-radius: 6px;
    color: var(--color-muted);
    cursor: pointer;
  }
  .file-btn:hover {
    background: var(--color-surface-2);
    color: #fff;
  }
  .print-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    width: 32px;
    border-radius: 6px;
    color: var(--color-accent);
    cursor: pointer;
  }
  .print-btn:hover {
    background: var(--color-accent);
    color: #fff;
  }
</style>
