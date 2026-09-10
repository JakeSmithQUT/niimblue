<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { labelProps } from "$lib/label";
  import {
    scene,
    addNode,
    addExistingNode,
    selectNode,
    moveNode,
    resizeNode,
    updateNode,
    beginMutation,
    removeSelected,
    duplicateSelected,
    undo,
    redo,
  } from "$lib/engine/scene";
  import { createImage } from "$lib/engine/factory";
  import { renderScene } from "$lib/engine/render";
  import { topNodeAt, handleAt, type HandleId } from "$lib/engine/geometry";
  import type { SceneNode, TextNode } from "$lib/engine/types";
  import { onImageLoaded } from "$lib/image/loader";
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
  let containerEl = $state<HTMLDivElement>();
  let ctx = $state<CanvasRenderingContext2D | null>(null);

  let zoom = $state(2);
  let pan = $state({ x: 0, y: 0 });
  let selectedId = $state<string | undefined>(undefined);
  let nodes = $state<SceneNode[]>([]);
  let availableTemplates = $state(PAPER_TEMPLATES);
  let connected = $state(false);

  type Interaction =
    | { kind: "none" }
    | { kind: "drag"; id: string; offset: { x: number; y: number } }
    | { kind: "resize"; id: string; handle: HandleId }
    | { kind: "pan"; start: { x: number; y: number }; origin: { x: number; y: number } };
  let interaction: Interaction = { kind: "none" };
  let activePointerId: number | undefined;

  let editingId = $state<string | undefined>(undefined);
  let editValue = $state("");
  let textareaEl = $state<HTMLTextAreaElement>();
  let cursor = $state("default");
  let raf = 0;

  const scheduleRender = () => {
    if (raf) return;
    raf = requestAnimationFrame(render);
  };

  const screenToWorld = (sx: number, sy: number) => ({
    x: (sx - pan.x) / zoom,
    y: (sy - pan.y) / zoom,
  });

  const render = () => {
    raf = 0;
    if (!canvasEl || !ctx || !containerEl) return;
    const c = ctx;
    const dpr = window.devicePixelRatio || 1;
    const rect = containerEl.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));

    if (canvasEl.width !== cssW * dpr || canvasEl.height !== cssH * dpr) {
      canvasEl.width = cssW * dpr;
      canvasEl.height = cssH * dpr;
      canvasEl.style.width = `${cssW}px`;
      canvasEl.style.height = `${cssH}px`;
    }

    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = "#f3f4f6";
    c.fillRect(0, 0, cssW, cssH);

    const { width, height } = $labelProps.size;
    const screenX = pan.x;
    const screenY = pan.y;
    const screenW = width * zoom;
    const screenH = height * zoom;

    c.save();
    c.shadowColor = "rgba(0,0,0,0.25)";
    c.shadowBlur = 12;
    c.shadowOffsetY = 4;
    c.fillStyle = "#fff";
    c.fillRect(screenX, screenY, screenW, screenH);
    c.restore();

    c.save();
    c.translate(pan.x, pan.y);
    c.scale(zoom, zoom);
    c.beginPath();
    c.rect(0, 0, width, height);
    c.clip();

    renderScene(c, nodes);
    drawFeedIndicator(c, $labelProps.printDirection, width, height);
    drawSelection(c, selectedId);

    c.restore();
  };

  const drawFeedIndicator = (c: CanvasRenderingContext2D, direction: "left" | "top", w: number, h: number) => {
    c.save();
    c.strokeStyle = "#ff5349";
    c.lineWidth = 2 / zoom;
    c.beginPath();
    if (direction === "left") {
      c.moveTo(0, 0);
      c.lineTo(0, h);
    } else {
      c.moveTo(0, 0);
      c.lineTo(w, 0);
    }
    c.stroke();
    c.restore();
  };

  const drawSelection = (c: CanvasRenderingContext2D, selId: string | undefined) => {
    if (!selId) return;
    const node = nodes.find((n) => n.id === selId);
    if (!node) return;
    c.save();
    c.translate(node.x + node.width / 2, node.y + node.height / 2);
    if (node.rotation) c.rotate((node.rotation * Math.PI) / 180);
    c.translate(-node.width / 2, -node.height / 2);
    c.strokeStyle = "#3b82f6";
    c.lineWidth = 1 / zoom;
    c.setLineDash([4 / zoom, 4 / zoom]);
    c.strokeRect(0, 0, node.width, node.height);
    c.setLineDash([]);
    if (node.kind !== "line") {
      const h = 6 / zoom;
      const handles: [number, number][] = [
        [0, 0],
        [node.width, 0],
        [0, node.height],
        [node.width, node.height],
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

  const cursorFor = (handle: HandleId | undefined, over: boolean): string => {
    if (handle === "nw" || handle === "se") return "nwse-resize";
    if (handle === "ne" || handle === "sw") return "nesw-resize";
    return over ? "move" : "default";
  };

  const localPos = (e: PointerEvent) => {
    const rect = canvasEl!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: PointerEvent) => {
    if (editingId) return;
    canvasEl!.setPointerCapture(e.pointerId);
    activePointerId = e.pointerId;

    if (e.button === 1 || (e.button === 0 && (e.altKey || e.metaKey))) {
      const p = localPos(e);
      interaction = { kind: "pan", start: p, origin: { ...pan } };
      cursor = "grabbing";
      return;
    }

    const p = localPos(e);
    const { x, y } = screenToWorld(p.x, p.y);
    const selected = nodes.find((n) => n.id === selectedId);
    if (selected) {
      const handle = handleAt(selected, x, y, zoom);
      if (handle) {
        beginMutation();
        interaction = { kind: "resize", id: selected.id, handle };
        return;
      }
    }
    const hit = topNodeAt(nodes, x, y);
    if (hit) {
      selectNode(hit.id);
      interaction = { kind: "drag", id: hit.id, offset: { x: x - hit.x, y: y - hit.y } };
      beginMutation();
    } else {
      selectNode(undefined);
      interaction = { kind: "pan", start: p, origin: { ...pan } };
      cursor = "grabbing";
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (interaction.kind === "none") {
      const p = localPos(e);
      const { x, y } = screenToWorld(p.x, p.y);
      const selected = nodes.find((n) => n.id === selectedId);
      if (selected) {
        const handle = handleAt(selected, x, y, zoom);
        cursor = cursorFor(handle, !!topNodeAt(nodes, x, y));
      } else {
        cursor = topNodeAt(nodes, x, y) ? "move" : "default";
      }
      return;
    }
    if (e.pointerId !== activePointerId) return;
    const p = localPos(e);

    if (interaction.kind === "pan") {
      pan = {
        x: interaction.origin.x + (p.x - interaction.start.x),
        y: interaction.origin.y + (p.y - interaction.start.y),
      };
      return;
    }
    if (interaction.kind === "drag") {
      const { x, y } = screenToWorld(p.x, p.y);
      moveNode(interaction.id, x - interaction.offset.x, y - interaction.offset.y);
      return;
    }
    if (interaction.kind === "resize") {
      const { x, y } = screenToWorld(p.x, p.y);
      resizeNode(interaction.id, interaction.handle, x, y);
      return;
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== activePointerId) return;
    canvasEl!.releasePointerCapture(e.pointerId);
    activePointerId = undefined;
    interaction = { kind: "none" };
    cursor = "default";
  };



  const onDoubleClick = (e: MouseEvent) => {
    const rect = canvasEl!.getBoundingClientRect();
    const { x, y } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
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

  const zoomAt = (sx: number, sy: number, factor: number) => {
    const next = Math.max(0.1, Math.min(32, zoom * factor));
    if (next === zoom) return;
    const world = screenToWorld(sx, sy);
    zoom = next;
    pan = { x: sx - world.x * zoom, y: sy - world.y * zoom };
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = canvasEl!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    if (e.ctrlKey) {
      const factor = Math.exp(-e.deltaY * 0.01);
      zoomAt(sx, sy, factor);
    } else {
      pan = { x: pan.x - e.deltaX, y: pan.y - e.deltaY };
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
    } else if (e.key === "0" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      zoomFit();
    } else if (!inField && (e.key === "+" || e.key === "=") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const rect = canvasEl!.getBoundingClientRect();
      zoomAt(rect.width / 2, rect.height / 2, 1.2);
    } else if (!inField && e.key === "-" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const rect = canvasEl!.getBoundingClientRect();
      zoomAt(rect.width / 2, rect.height / 2, 1 / 1.2);
    } else if (!inField && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      const sel = nodes.find((n) => n.id === selectedId);
      if (!sel) return;
      const step = e.shiftKey ? 10 : 1;
      const nx = e.key === "ArrowLeft" ? sel.x - step : e.key === "ArrowRight" ? sel.x + step : sel.x;
      const ny = e.key === "ArrowUp" ? sel.y - step : e.key === "ArrowDown" ? sel.y + step : sel.y;
      moveNode(sel.id, nx, ny);
    }
  };

  const zoomIn = () => {
    const rect = canvasEl?.getBoundingClientRect();
    if (rect) zoomAt(rect.width / 2, rect.height / 2, 1.2);
  };
  const zoomOut = () => {
    const rect = canvasEl?.getBoundingClientRect();
    if (rect) zoomAt(rect.width / 2, rect.height / 2, 1 / 1.2);
  };
  const zoomFit = () => {
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const { width, height } = $labelProps.size;
    if (!width || !height) return;
    const z = Math.min(rect.width / width, rect.height / height) * 0.9;
    zoom = z;
    pan = {
      x: (rect.width - width * z) / 2,
      y: (rect.height - height * z) / 2,
    };
  };

  let offImageLoaded: (() => void) | undefined;
  let ro: ResizeObserver | undefined;

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
    offImageLoaded = onImageLoaded(() => scheduleRender());
    if (containerEl) {
      ro = new ResizeObserver(() => scheduleRender());
      ro.observe(containerEl);
    }
    zoomFit();
    return () => {
      unsubScene();
      unsubMeta();
      unsubConn();
      offImageLoaded?.();
      ro?.disconnect();
    };
  });

  onDestroy(() => {
    if (raf) cancelAnimationFrame(raf);
  });

  $effect(() => {
    void [nodes, selectedId, $labelProps.size, zoom, pan];
    scheduleRender();
  });

  const editStyle = (): string => {
    const t = nodes.find((n) => n.id === editingId) as TextNode | undefined;
    if (!t || !canvasEl) return "";
    const left = pan.x + t.x * zoom;
    const top = pan.y + t.y * zoom;
    return `left: ${left}px; top: ${top}px; width: ${t.width * zoom}px; min-height: ${t.fontSize * t.lineHeight * zoom}px; font-size: ${t.fontSize * zoom}px; font-family: ${t.fontFamily}; font-weight: ${t.fontWeight}; line-height: ${t.lineHeight}; text-align: ${t.align};`;
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
      <span class="text-success">filtered to {$printerMeta?.model ?? "printer"}</span>
    {:else}
      <span>connect a printer to filter</span>
    {/if}
    <span class="ml-1">{$labelProps.size.width} × {$labelProps.size.height} px</span>
    <span class="ml-1 text-muted/70">feed: {$labelProps.printDirection}</span>
    <span class="ml-auto tabular-nums">{Math.round(zoom * 100)}%</span>
  </div>

  <div class="relative min-h-0 flex-1 overflow-hidden bg-surface-1" bind:this={containerEl}>
    <canvas
      bind:this={canvasEl}
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      ondblclick={onDoubleClick}
      onwheel={onWheel}
      style="touch-action: none; image-rendering: pixelated; cursor: {cursor}; display: block;"
      class="h-full w-full"
    ></canvas>
  </div>
</div>

{#if editingId}
  <textarea
    bind:this={textareaEl}
    class="fixed z-50 m-0 rounded border-2 border-blue-500 bg-white p-0 text-black outline-none resize-none"
    style={editStyle()}
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
