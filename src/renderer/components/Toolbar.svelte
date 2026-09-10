<script lang="ts">
  import type { NodeKind } from "$lib/engine/types";
  import { kindLabel } from "$lib/engine/types";

  let {
    onadd,
    zoom,
    onZoomIn,
    onZoomOut,
    onZoomFit,
  }: {
    onadd: (kind: NodeKind) => void;
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomFit: () => void;
  } = $props();

  const tools: { kind: NodeKind; icon: string }[] = [
    { kind: "text", icon: "title" },
    { kind: "rect", icon: "rectangle" },
    { kind: "ellipse", icon: "circle" },
    { kind: "line", icon: "remove" },
    { kind: "qrcode", icon: "qr_code" },
    { kind: "barcode", icon: "barcode" },
    { kind: "aruco", icon: "grid_on" },
  ];
</script>

<div
  class="flex shrink-0 items-center gap-1 border-b border-border bg-surface-1 px-3 py-1.5"
>
  {#each tools as t (t.kind)}
    <button
      class="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-white"
      title={`Add ${kindLabel[t.kind]}`}
      onclick={() => onadd(t.kind)}
    >
      <span class="material-symbols-rounded text-[20px]">{t.icon}</span>
    </button>
  {/each}

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
</style>
