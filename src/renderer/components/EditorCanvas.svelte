<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { labelProps } from "$lib/label";
  import { scene, addNode, addExistingNode, selectNode, moveNode, resizeNode, updateNode, beginMutation, removeSelected, duplicateSelected, undo, redo } from "$lib/engine/scene";
  import { createImage } from "$lib/engine/factory";
  import { renderScene } from "$lib/engine/render";
  import { topNodeAt, handleAt, type HandleId } from "$lib/engine/geometry";
  import type { SceneNode, TextNode } from "$lib/engine/types";
  import Toolbar from "./Toolbar.svelte";
  import { setLabelSize } from "$lib/label";
  import { PAPER_TEMPLATES, PAPER_FAMILIES, filterTemplatesForPrinter } from "$lib/paper";
  import { printerMeta, connectionState } from "$lib/printer";

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
  let availableTemplates = $state(PAPER_TEMPLATES);
  let connected = $state(false);

  const imageCache = new Map<string, HTMLImageElement>();
  let dragging = $state(false);
  let dragNode: SceneNode | undefined;
  let dragOffset = { x: 0, y: 0 };
  let resizing = $state(false);
  let resizeHandle: HandleId | undefined;
  let resizeTarget: SceneNode | undefined;
  let editingId = $state<string | undefined>(undefined);
  let editValue = $state("");
  let textareaEl = $state<HTMLTextAreaElement>();
  let cursor = $state("default");
  let raf = 0;
  let renderToken = 0;

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

    const newW = Math.round(displayW * dpr);
    const newH = Math.round(displayH * dpr);
    if (canvasEl.width !== newW || canvasEl.height !== newH) {
      canvasEl.width = newW;
      canvasEl.height = newH;
    }
    canvasEl.style.width = `${displayW}px`;
    canvasEl.style.height = `${displayH}px`;

    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = "#fff";
    c.fillRect(0, 0, displayW, displayH);

    c.save();
    c.scale(zoom, zoom);

    const snapshot = nodes;
    const selId = selectedId;
    const token = ++renderToken;
    renderScene(c, snapshot, imageCache).then(() => {
      if (token !== renderToken) return;
      drawSelection(c, snapshot, selId);
      c.restore();
    });
  };

  const drawSelection = (c: CanvasRenderingContext2D, snapshot: SceneNode[], selId: string | undefined) => {
    if (!selId) return;
    const node = snapshot.find((n) => n.id === selId);
    if (!node) return;
    c.save();
    c.strokeStyle = "#3b82f6";
    c.lineWidth = 1 / zoom;
    c.setLineDash([4 / zoom, 4 / zoom]);
    c.strokeRect(node.x, node.y, node.width, node.height);
    c.setLineDash([]);
    if (node.kind !== "line") {
      const h = 6 / zoom;
      const handles: [number, number][] = [
        [node.x, node.y],
        [node.x + node.width, node.y],
        [node.x, node.y + node.height],
        [node.x + node.width, node.y + node.height],
      ];
      c.fillStyle = "#fff";
      c.strokeStyle = "#3b82f6";
      c.lineWidth = 1.5 / zoom;
      for (const [hx, hy] of handles) {
        c.beginPath();
        c.arc(hx, hy, h, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }
    }
    c.restore();
  };

  const toSceneCoords = (e: MouseEvent) => {
    const rect = canvasEl!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    return { x, y };
  };

  const cursorFor = (handle: HandleId | undefined, over: boolean): string => {
    if (handle === "nw" || handle === "se") return "nwse-resize";
    if (handle === "ne" || handle === "sw") return "nesw-resize";
    return over ? "move" : "default";
  };

  const onDown = (e: MouseEvent) => {
    if (editingId) return;
    e.preventDefault();
    const { x, y } = toSceneCoords(e);
    const selected = nodes.find((n) => n.id === selectedId);
    if (selected) {
      const handle = handleAt(selected, x, y, zoom);
      if (handle) {
        beginMutation();
        resizing = true;
        resizeHandle = handle;
        resizeTarget = selected;
        beginDragListeners();
        return;
      }
    }
    const hit = topNodeAt(nodes, x, y);
    if (hit) {
      selectNode(hit.id);
      dragNode = hit;
      dragOffset = { x: x - hit.x, y: y - hit.y };
      beginMutation();
      dragging = true;
      beginDragListeners();
    } else {
      selectNode(undefined);
    }
  };

  const onMove = (e: MouseEvent) => {
    if (resizing && resizeTarget && resizeHandle) {
      const { x, y } = toSceneCoords(e);
      resizeNode(resizeTarget.id, resizeHandle, x, y);
      scheduleRender();
      return;
    }
    if (!dragging || !dragNode) return;
    const { x, y } = toSceneCoords(e);
    moveNode(dragNode.id, x - dragOffset.x, y - dragOffset.y);
    scheduleRender();
  };

  const onHover = (e: MouseEvent) => {
    if (dragging || resizing) return;
    const { x, y } = toSceneCoords(e);
    const selected = nodes.find((n) => n.id === selectedId);
    if (selected) {
      const handle = handleAt(selected, x, y, zoom);
      cursor = cursorFor(handle, !!topNodeAt(nodes, x, y));
    } else {
      cursor = topNodeAt(nodes, x, y) ? "move" : "default";
    }
  };

  const onUp = () => {
    if (!dragging && !resizing) return;
    dragging = false;
    resizing = false;
    dragNode = undefined;
    resizeTarget = undefined;
    resizeHandle = undefined;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };

  const beginDragListeners = () => {
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onDoubleClick = (e: MouseEvent) => {
    const { x, y } = toSceneCoords(e);
    const hit = topNodeAt(nodes, x, y);
    if (hit && hit.kind === "text") {
      const t = hit as TextNode;
      editingId = hit.id;
      editValue = t.text;
      selectNode(hit.id);
    }
  };

  $effect(() => {
    if (editingId && textareaEl) {
      textareaEl.focus();
      textareaEl.select();
    }
  });

  const commitEdit = () => {
    if (editingId) {
      updateNode(editingId, { text: editValue } as Partial<SceneNode>);
    }
    editingId = undefined;
    editValue = "";
  };

  const cancelEdit = () => {
    editingId = undefined;
    editValue = "";
  };

  onMount(() => {
    if (canvasEl) ctx = canvasEl.getContext("2d");
    const unsubScene = scene.subscribe((s) => {
      nodes = s.nodes;
      selectedId = s.selectedId;
    });
    const unsubMeta = printerMeta.subscribe((m) => {
      availableTemplates = filterTemplatesForPrinter(PAPER_TEMPLATES, m);
    });
    const unsubConn = connectionState.subscribe((c) => {
      connected = c === "connected";
    });
    scheduleRender();
    return () => {
      unsubScene();
      unsubMeta();
      unsubConn();
    };
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
      if (editingId) return;
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
      {#each PAPER_FAMILIES as fam (fam.id)}
        {@const inFam = PAPER_TEMPLATES
          .map((t, i) => ({ t, i }))
          .filter(({ t }) => t.family === fam.id && (!connected || availableTemplates.includes(t)))}
        {#if inFam.length > 0}
          <optgroup label={fam.label}>
            {#each inFam as { t, i } (t.title)}
              <option value={i}>{t.title} ({t.widthMm}x{t.continuous ? 'var' : t.heightMm}mm)</option>
            {/each}
          </optgroup>
        {/if}
      {/each}
    </select>
    {#if connected}
      <span class="text-success">filtered to connected printer</span>
    {:else}
      <span>connect a printer to filter</span>
    {/if}
    <span class="ml-1">{$labelProps.size.width} x {$labelProps.size.height} px</span>
  </div>

  <div class="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-surface-1 p-8">
    <canvas
      bind:this={canvasEl}
      onmousedown={onDown}
      onmousemove={onHover}
      ondblclick={onDoubleClick}
      onwheel={onWheel}
      class="shadow-2xl"
      style="image-rendering: pixelated; cursor: {cursor};"
    ></canvas>
  </div>
</div>

{#if editingId}
  {@const t = nodes.find((n) => n.id === editingId) as TextNode | undefined}
  {#if t && canvasEl}
    {@const rect = canvasEl.getBoundingClientRect()}
    <textarea
      bind:this={textareaEl}
      class="fixed z-50 m-0 rounded border-2 border-blue-500 bg-white p-0 text-black outline-none resize-none"
      style={`left: ${rect.left + t.x * zoom}px; top: ${rect.top + t.y * zoom}px; width: ${t.width * zoom}px; min-height: ${t.fontSize * t.lineHeight * zoom}px; font-size: ${t.fontSize * zoom}px; font-family: ${t.fontFamily}; font-weight: ${t.fontWeight}; line-height: ${t.lineHeight}; text-align: ${t.align};`}
      value={editValue}
      oninput={(e) => (editValue = e.currentTarget.value)}
      onblur={commitEdit}
      onkeydown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          (e.currentTarget as HTMLTextAreaElement).blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelEdit();
        }
      }}
    ></textarea>
  {/if}
{/if}
