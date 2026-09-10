<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { csvParse } from "d3-dsv";
  import { LabelType, printTaskNames, type PrintTaskName } from "@mmote/niimbluelib";
  import { connectionState, printerClient, printerMeta } from "$lib/printer";
  import { labelProps } from "$lib/label";
  import {
    defaultOptions,
    renderPreviewCanvas,
    printBatch,
    cancelPrint,
    headSizeWarning,
    printState,
    printProgress,
    printError,
    type PrintOptions,
    type BatchPage,
  } from "$lib/print";
  import type { PostProcessType } from "$lib/image/post_process";
  import { toast } from "$lib/toast";

  let { show = $bindable() }: { show: boolean } = $props();

  let opts = $state<PrintOptions>(defaultOptions());
  let previewCanvas = $state<HTMLCanvasElement>();
  let previewCtx: CanvasRenderingContext2D | undefined;
  let csvText = $state<string>("");
  let csvEnabled = $state<boolean>(false);
  let csvPages: BatchPage[] = [];
  let page = $state<number>(0);
  let pagesTotal = $state<number>(1);
  let warning = $state<string>("");
  let renderPending = false;

  const disconnected = $derived($connectionState !== "connected");
  const detectedTask = $derived($printerClient?.getPrintTaskType());

  const labelTypeValues = $derived(
    (Object.values(LabelType) as (string | LabelType)[]).filter(
      (v): v is LabelType => typeof v !== "string",
    ),
  );

  const postProcessChoices: { value: PostProcessType; label: string }[] = [
    { value: "threshold", label: "Threshold" },
    { value: "atkinson", label: "Atkinson" },
    { value: "bayer2", label: "Bayer 2x2" },
    { value: "bayer4", label: "Bayer 4x4" },
    { value: "bayer8", label: "Bayer 8x8" },
    { value: "floyd_steinberg", label: "Floyd-Steinberg" },
    { value: "jjn", label: "Jarvis-Judice-Ninke" },
    { value: "stucki", label: "Stucki" },
  ];

  const isBayer = $derived(
    opts.postProcess.type === "bayer2" ||
      opts.postProcess.type === "bayer4" ||
      opts.postProcess.type === "bayer8",
  );

  const isDiffusion = $derived(
    opts.postProcess.type === "floyd_steinberg" ||
      opts.postProcess.type === "jjn" ||
      opts.postProcess.type === "stucki" ||
      opts.postProcess.type === "atkinson",
  );

  const renderPreview = async () => {
    if (!previewCanvas) return;
    const variables = csvEnabled && csvPages.length > page ? csvPages[page].variables : undefined;
    const canvas = await renderPreviewCanvas(opts, variables);
    previewCanvas.width = canvas.width;
    previewCanvas.height = canvas.height;
    if (!previewCtx) previewCtx = previewCanvas.getContext("2d")!;
    previewCtx.fillStyle = "#fff";
    previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewCtx.drawImage(canvas, 0, 0);
    warning = headSizeWarning(opts) ?? "";
  };

  const scheduleRender = () => {
    if (renderPending) return;
    renderPending = true;
    requestAnimationFrame(() => {
      renderPending = false;
      renderPreview();
    });
  };

  const parseCsv = () => {
    if (!csvEnabled || !csvText.trim()) {
      csvPages = [];
      pagesTotal = 1;
      return;
    }
    const parsed = csvParse(csvText);
    const pages: BatchPage[] = [];
    for (const row of parsed) {
      const cleaned: Record<string, string> = {};
      for (const k of Object.keys(row)) {
        cleaned[k] = (row[k] ?? "").replaceAll("\\n", "\n");
      }
      let times = 1;
      const raw = cleaned.$times;
      if (raw !== undefined && raw !== "") {
        const n = parseInt(raw, 10);
        if (!Number.isNaN(n)) times = Math.max(0, n);
      }
      for (let i = 0; i < times; i++) pages.push({ variables: cleaned, quantity: 1 });
    }
    csvPages = pages;
    pagesTotal = pages.length || 1;
    page = Math.min(page, pagesTotal - 1);
  };

  const onPage = (delta: number) => {
    page = Math.max(0, Math.min(pagesTotal - 1, page + delta));
    renderPreview();
  };

  const onPrint = async () => {
    let pages: BatchPage[];
    if (csvEnabled && csvPages.length > 0) {
      pages = csvPages.map((p) => ({ ...p, quantity: opts.quantity }));
    } else {
      pages = [{ variables: {}, quantity: opts.quantity }];
    }
    await printBatch(opts, pages);
    if ($printError) toast($printError, "error");
    else toast("Print complete", "success");
  };

  const close = () => {
    if ($printState !== "idle") return;
    show = false;
  };

  const onCancel = () => {
    cancelPrint();
  };

  $effect(() => {
    scheduleRender();
  });

  onMount(() => {
    if (detectedTask) opts.printTaskName = detectedTask;
    parseCsv();
    renderPreview();
  });

  onDestroy(() => {
    if ($printState !== "idle") cancelPrint();
  });
</script>

{#if show}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    role="presentation"
    onclick={close}
    onkeydown={(e) => e.key === "Escape" && close()}
  >
    <div
      class="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-surface-0 shadow-2xl"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <header class="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
        <h2 class="text-sm font-medium">Print</h2>
        <button class="close-btn" onclick={close} title="Close" disabled={$printState !== "idle"}>
          <span class="material-symbols-rounded text-[20px]">close</span>
        </button>
      </header>

      <div class="flex min-h-0 flex-1">
        <div class="flex w-1/2 items-center justify-center overflow-auto border-r border-border p-4">
          <div class="flex items-center gap-2">
            {#if pagesTotal > 1}
              <button class="page-btn" disabled={$printState !== "idle"} onclick={() => onPage(-1)} title="Previous page">
                <span class="material-symbols-rounded">chevron_left</span>
              </button>
            {/if}
            <canvas bind:this={previewCanvas} class="preview-canvas print-{$labelProps.printDirection}"></canvas>
            {#if pagesTotal > 1}
              <button class="page-btn" disabled={$printState !== "idle"} onclick={() => onPage(1)} title="Next page">
                <span class="material-symbols-rounded">chevron_right</span>
              </button>
            {/if}
          </div>
        </div>

        <div class="flex w-1/2 flex-col overflow-y-auto p-4 text-sm">
          {#if pagesTotal > 1}
            <div class="mb-3 text-center text-muted">Page {page + 1} / {pagesTotal}</div>
          {/if}

          {#if $printState === "sending"}
            <div class="mb-3 text-center text-muted">Sending...</div>
          {/if}
          {#if $printState === "printing"}
            <div class="mb-3">
              <div class="mb-1 text-center text-muted">Printing...</div>
              <div class="h-1.5 w-full overflow-hidden rounded bg-surface-2">
                <div class="h-full bg-accent transition-none" style="width: {$printProgress}%"></div>
              </div>
            </div>
          {/if}
          {#if $printError}
            <div class="mb-3 rounded border border-danger/50 bg-danger/10 px-3 py-2 text-danger">{$printError}</div>
          {/if}
          {#if warning}
            <div class="mb-3 rounded border border-warning/50 bg-warning/10 px-3 py-2 text-warning">{warning}</div>
          {/if}

          <label class="mb-3 block">
            <span class="dlg-label">Post process</span>
            <select class="dlg-input" bind:value={opts.postProcess.type} onchange={scheduleRender}>
              {#each postProcessChoices as pp (pp.value)}
                <option value={pp.value}>{pp.label}</option>
              {/each}
            </select>
          </label>

          {#if !isBayer}
            <label class="mb-3 block">
              <span class="dlg-label">Threshold</span>
              <input class="dlg-range" type="range" min="1" max="255" bind:value={opts.postProcess.threshold} onchange={scheduleRender} />
              <span class="text-muted tabular-nums">{opts.postProcess.threshold}</span>
            </label>
          {/if}

          {#if isDiffusion}
            <label class="mb-3 block">
              <span class="dlg-label">Strength</span>
              <input class="dlg-range" type="range" min="0" max="1.5" step="0.1" bind:value={opts.postProcess.strength} onchange={scheduleRender} />
              <span class="text-muted tabular-nums">{opts.postProcess.strength.toFixed(1)}</span>
            </label>
          {/if}

          <div class="mb-3 flex gap-2">
            <button
              class="toggle-btn"
              class:active={opts.postProcess.invert}
              onclick={() => { opts.postProcess.invert = !opts.postProcess.invert; scheduleRender(); }}
              title="Invert"
            >
              <span class="material-symbols-rounded text-[18px]">invert_colors</span>
            </button>
            <button
              class="toggle-btn"
              class:active={opts.postProcess.mirror}
              onclick={() => { opts.postProcess.mirror = !opts.postProcess.mirror; scheduleRender(); }}
              title="Mirror"
            >
              <span class="material-symbols-rounded text-[18px]">flip</span>
            </button>
            {#if isDiffusion}
              <button
                class="toggle-btn"
                class:active={opts.postProcess.serpentine}
                onclick={() => { opts.postProcess.serpentine = !opts.postProcess.serpentine; scheduleRender(); }}
                title="Serpentine scan"
              >
                <span class="material-symbols-rounded text-[18px]">swap_vert</span>
              </button>
            {/if}
          </div>

          <label class="mb-3 block">
            <span class="dlg-label">Copies</span>
            <input class="dlg-input" type="number" min="1" bind:value={opts.quantity} />
          </label>

          <label class="mb-3 block">
            <span class="dlg-label">Density</span>
            <input class="dlg-input" type="number" min={$printerMeta?.densityMin ?? 1} max={$printerMeta?.densityMax ?? 20} bind:value={opts.density} />
          </label>

          {#if opts.printTaskName === "D110M_V4"}
            <label class="mb-3 block">
              <span class="dlg-label">Speed</span>
              <select class="dlg-input" bind:value={opts.speed}>
                <option value={0}>Clarity</option>
                <option value={1}>Speed</option>
              </select>
            </label>
          {/if}

          <label class="mb-3 block">
            <span class="dlg-label">Label type</span>
            <select class="dlg-input" bind:value={opts.labelType}>
              {#each labelTypeValues as lt (lt)}
                <option value={lt}>{LabelType[lt]}{#if $printerMeta?.paperTypes?.includes(lt)} ✔{/if}</option>
              {/each}
            </select>
          </label>

          <label class="mb-3 block">
            <span class="dlg-label">Print task</span>
            <select class="dlg-input" bind:value={opts.printTaskName}>
              {#each printTaskNames as name (name)}
                <option value={name}>{name}{#if detectedTask === name} ✔{/if}</option>
              {/each}
            </select>
          </label>

          <label class="mb-3 block">
            <span class="dlg-label">Offset</span>
            <div class="flex gap-2">
              <input class="dlg-input" type="number" bind:value={opts.offset.x} onchange={scheduleRender} />
              <input class="dlg-input" type="number" bind:value={opts.offset.y} onchange={scheduleRender} />
              <select class="dlg-input" bind:value={opts.offset.outer} onchange={scheduleRender}>
                <option value={false}>Inner</option>
                <option value={true}>Outer</option>
              </select>
            </div>
          </label>

          <label class="mb-3 block">
            <span class="dlg-label">CSV batch</span>
            <textarea class="dlg-input" rows="3" placeholder="name,value" bind:value={csvText} oninput={parseCsv}></textarea>
          </label>
          <label class="mb-3 flex items-center gap-2 text-muted">
            <input type="checkbox" bind:checked={csvEnabled} onchange={() => { parseCsv(); renderPreview(); }} />
            <span>Enable batch printing</span>
          </label>
        </div>
      </div>

      <footer class="flex shrink-0 items-center justify-end gap-2 border-t border-border px-4 py-2.5">
        {#if $printState !== "idle"}
          <button class="footer-btn-danger" onclick={onCancel}>Cancel print</button>
        {/if}
        <button class="footer-btn-primary" disabled={disconnected || $printState !== "idle"} onclick={onPrint}>
          {#if disconnected}
            Not connected
          {:else}
            <span class="material-symbols-rounded text-[18px]">print</span> Print
          {/if}
        </button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .preview-canvas {
    image-rendering: pixelated;
    border: 1px solid var(--color-border);
    max-width: 100%;
    max-height: 60vh;
  }
  .preview-canvas.print-left {
    border-left: 2px solid var(--color-accent);
  }
  .preview-canvas.print-top {
    border-top: 2px solid var(--color-accent);
  }
  .dlg-label {
    display: block;
    font-size: 11px;
    margin-bottom: 4px;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .dlg-input {
    width: 100%;
    border-radius: 6px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: inherit;
    padding: 5px 8px;
    font-size: 13px;
  }
  .dlg-range {
    flex: 1;
    width: 100%;
  }
  .toggle-btn {
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
  .toggle-btn:hover {
    color: #fff;
    background: var(--color-surface-3);
  }
  .toggle-btn.active {
    color: #fff;
    background: var(--color-accent);
    border-color: transparent;
  }
  .page-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    width: 32px;
    border-radius: 6px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-muted);
    cursor: pointer;
  }
  .page-btn:hover {
    color: #fff;
    background: var(--color-surface-3);
  }
  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    width: 28px;
    border-radius: 6px;
    color: var(--color-muted);
    cursor: pointer;
  }
  .close-btn:hover {
    color: #fff;
    background: var(--color-surface-2);
  }
  .footer-btn-primary,
  .footer-btn-danger {
    display: flex;
    align-items: center;
    gap: 6px;
    border-radius: 6px;
    padding: 6px 16px;
    font-size: 13px;
    cursor: pointer;
  }
  .footer-btn-primary {
    border: 1px solid var(--color-accent);
    background: var(--color-accent);
    color: #fff;
  }
  .footer-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .footer-btn-danger {
    border: 1px solid var(--color-danger);
    background: transparent;
    color: var(--color-danger);
  }
</style>
