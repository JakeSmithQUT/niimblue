<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { labelProps } from "$lib/label";
  import { scene, addNode, addExistingNode, selectNode, moveNode, beginMutation, removeSelected, duplicateSelected, undo, redo } from "$lib/engine/scene";
  import { createImage } from "$lib/engine/factory";
  import { renderScene } from "$lib/engine/render";
  import { topNodeAt } from "$lib/engine/geometry";
  import type { SceneNode } from "$lib/engine/types";
  import Toolbar from "./Toolbar.svelte";
  import { setLabelSize } from "$lib/label";
  import { PAPER_TEMPLATES } from "$lib/paper";

  let { onPrint }: { onPrint: () => void } = $props();
  let imageInput = $state<HTMLInputElement>();

  const pickImage = () => imageInput?.click();

  const onImageChosen = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const max = 200;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        addExistingNode(createImage(src, Math.round(img.width * scale), Math.round(img.height * scale)));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  let canvasEl = $state<HTMLCanvasElement>();
  let ctx = $state<CanvasRenderingContext2D | null>(null);
  let zoom = $state(2);
  let selectedId = $state<string | undefined>(undefined);
  let nodes = $state<SceneNode[]>([]);

  const imageCache = new Map<string, HTMLImageElement>();
  let dragging = $state(false);
  let dragNode: SceneNode | undefined;
  let dragOffset = { x: 0, y: 0 };
  let raf = 0;

  const scheduleRender = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(render);
  };

  const render = () => {
    raf = 0;
    if (!canvasEl || !ctx) return;
    const c = ctx;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = $labelProps.size;
    const displayW = width * zoom;
    const displayH = height * zoom;

    canvasEl.width = displayW * dpr;
    canvasEl.height = displayH * dpr;
    canvasEl.style.width = `${displayW}px`;
    canvasEl.style.height = `${displayH}px`;

    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = "#fff";
    c.fillRect(0, 0, displayW, displayH);

    c.save();
    c.scale(zoom, zoom);

    renderScene(c, nodes, imageCache).then(() => {
      drawSelection(c);
      c.restore();
    });
  };

  const drawSelection = (c: CanvasRenderingContext2D) => {
    if (!selectedId) return;
    const node = nodes.find((n) => n.id === selectedId);
    if (!node) return;
    c.save();
    c.strokeStyle = "#3b82f6";
    c.lineWidth = 1 / zoom;
    c.setLineDash([4 / zoom, 4 / zoom]);
    c.strokeRect(node.x, node.y, node.width, node.height);
    c.setLineDash([]);
    const h = 5 / zoom;
    const handles = [
      [node.x, node.y],
      [node.x + node.width, node.y],
      [node.x, node.y + node.height],
      [node.x + node.width, node.y + node.height],
    ];
    c.fillStyle = "#3b82f6";
    for (const [hx, hy] of handles) {
      c.fillRect(hx - h, hy - h, h * 2, h * 2);
    }
    c.restore();
  };

  const toSceneCoords = (e: MouseEvent) => {
    const rect = canvasEl!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    return { x, y };
  };

  const onDown = (e: MouseEvent) => {
    const { x, y } = toSceneCoords(e);
    const hit = topNodeAt(nodes, x, y);
    if (hit) {
      selectNode(hit.id);
      dragNode = hit;
      dragOffset = { x: x - hit.x, y: y - hit.y };
      beginMutation();
      dragging = true;
    } else {
      selectNode(undefined);
    }
  };

  const onMove = (e: MouseEvent) => {
    if (!dragging || !dragNode) return;
    const { x, y } = toSceneCoords(e);
    moveNode(dragNode.id, x - dragOffset.x, y - dragOffset.y);
    scheduleRender();
  };

  const onUp = () => {
    dragging = false;
    dragNode = undefined;
  };

  onMount(() => {
    if (canvasEl) ctx = canvasEl.getContext("2d");
    const unsub = scene.subscribe((s) => {
      nodes = s.nodes;
      selectedId = s.selectedId;
    });
    scheduleRender();
    return unsub;
  });

  onDestroy(() => {
    if (raf) cancelAnimationFrame(raf);
  });

  $effect(() => {
    nodes;
    selectedId;
    $labelProps.size;
    scheduleRender();
  });

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      zoom = Math.max(0.25, Math.min(8, zoom - e.deltaY * 0.002));
      scheduleRender();
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const inField = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
    if (e.key === "Delete" || e.key === "Backspace") {
      if (inField) return;
      removeSelected();
    } else if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      duplicateSelected();
    } else if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else if (e.key === "Escape") {
      if (inField) return;
      selectNode(undefined);
    } else if (!inField && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      const sel = nodes.find((n) => n.id === selectedId);
      if (!sel) return;
      const step = e.shiftKey ? 10 : 1;
      const nx = e.key === "ArrowLeft" ? sel.x - step : e.key === "ArrowRight" ? sel.x + step : sel.x;
      const ny = e.key === "ArrowUp" ? sel.y - step : e.key === "ArrowDown" ? sel.y + step : sel.y;
      moveNode(sel.id, nx, ny);
      scheduleRender();
    }
  };

  const zoomIn = () => {
    zoom = Math.min(8, zoom * 1.2);
    scheduleRender();
  };
  const zoomOut = () => {
    zoom = Math.max(0.25, zoom / 1.2);
    scheduleRender();
  };
  const zoomFit = () => {
    if (!canvasEl) return;
    const parent = canvasEl.parentElement!.getBoundingClientRect();
    zoom = Math.min(parent.width / $labelProps.size.width, parent.height / $labelProps.size.height) * 0.9;
    scheduleRender();
  };
</script>

<svelte:window onkeydown={onKeyDown} />

<input type="file" accept="image/*" class="hidden" bind:this={imageInput} onchange={onImageChosen} />

<div class="flex h-full flex-col">
  <Toolbar onadd={addNode} onAddImage={pickImage} onPrint={onPrint} {zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onZoomFit={zoomFit} />

  <div class="flex shrink-0 items-center gap-2 border-b border-border bg-surface-0 px-3 py-1 text-xs text-muted">
    <span>Paper</span>
    <select
      class="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs"
      onchange={(e) => {
        const idx = Number(e.currentTarget.value);
        if (idx >= 0) setLabelSize(PAPER_TEMPLATES[idx]);
      }}
    >
      <option value={-1}>Custom...</option>
      {#each PAPER_TEMPLATES as t, i (t.title)}
        <option value={i}>{t.title} ({t.widthMm}x{t.continuous ? 'var' : t.heightMm}mm)</option>
      {/each}
    </select>
    <span class="ml-1">{$labelProps.size.width} x {$labelProps.size.height} px</span>
  </div>

  <div class="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-surface-1 p-8">
    <canvas
      bind:this={canvasEl}
      onmousedown={onDown}
      onmousemove={onMove}
      onmouseup={onUp}
      onmouseleave={onUp}
      onwheel={onWheel}
      class="shadow-2xl"
      style="image-rendering: pixelated; cursor: {dragging ? 'grabbing' : 'default'};"
    ></canvas>
  </div>
</div>
