import { writable, get } from "svelte/store";
import {
  ImageEncoder,
  LabelType,
  Utils,
  type AbstractPrintTask,
  type EncodedImage,
  type PrintTaskName,
  type PrintProgressEvent,
} from "@mmote/niimbluelib";
import { labelProps } from "./label";
import { scene } from "./engine/scene";
import { printerClient, printerMeta, startHeartbeat, stopHeartbeat } from "./printer";
import { renderLabelToCanvas } from "./image/rasterize";
import { applyPostProcess, type PostProcessOptions } from "./image/post_process";

export type PrintState = "idle" | "sending" | "printing";

export type PrintOptions = {
  quantity: number;
  density: number;
  speed: 0 | 1;
  labelType: LabelType;
  printTaskName: PrintTaskName;
  postProcess: PostProcessOptions;
  offset: { x: number; y: number; outer: boolean };
};

export type BatchPage = { variables: Record<string, string>; quantity: number };

export const printState = writable<PrintState>("idle");
export const printProgress = writable<number>(0);
export const printError = writable<string>("");
export const printPageInfo = writable<{ page: number; total: number }>({ page: 0, total: 1 });

let currentTask: AbstractPrintTask | undefined;

export const defaultOptions = (): PrintOptions => {
  const meta = get(printerMeta);
  return {
    quantity: 1,
    density: meta?.densityDefault ?? 3,
    speed: 1,
    labelType: LabelType.WithGaps,
    printTaskName: "B1",
    postProcess: {
      type: "threshold",
      invert: false,
      mirror: false,
      threshold: 140,
      strength: 1,
      serpentine: true,
    },
    offset: { x: 0, y: 0, outer: false },
  };
};

export const renderPreviewCanvas = async (
  opts: PrintOptions,
  variables?: Record<string, string>,
  imageCache?: Map<string, HTMLImageElement>,
): Promise<HTMLCanvasElement> => {
  const label = get(labelProps);
  const { nodes } = get(scene);
  const cache = imageCache ?? new Map<string, HTMLImageElement>();

  const { canvas, ctx } = await renderLabelToCanvas(label, nodes, cache, variables);

  const original = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const processed = applyPostProcess(original, opts.postProcess);

  const targetW = opts.offset.outer ? canvas.width + Math.abs(opts.offset.x) : canvas.width;
  const targetH = opts.offset.outer ? canvas.height + Math.abs(opts.offset.y) : canvas.height;
  const out = document.createElement("canvas");
  out.width = targetW;
  out.height = targetH;
  const outCtx = out.getContext("2d")!;
  outCtx.fillStyle = "#fff";
  outCtx.fillRect(0, 0, targetW, targetH);
  outCtx.putImageData(processed, opts.offset.outer ? Math.max(opts.offset.x, 0) : opts.offset.x, opts.offset.outer ? Math.max(opts.offset.y, 0) : opts.offset.y);

  return out;
};

export const printBatch = async (
  opts: PrintOptions,
  pages: BatchPage[],
): Promise<void> => {
  const client = get(printerClient);
  if (!client) {
    printError.set("Printer not connected");
    return;
  }

  printState.set("sending");
  printError.set("");
  stopHeartbeat();

  const label = get(labelProps);
  const imageCache = new Map<string, HTMLImageElement>();
  const totalPages = pages.length;

  try {
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      printPageInfo.set({ page: pageIndex + 1, total: totalPages });

      currentTask = client.abstraction.newPrintTask(opts.printTaskName, {
        totalPages: opts.quantity,
        density: opts.density,
        speed: opts.speed,
        labelType: opts.labelType,
        statusPollIntervalMs: 100,
        statusTimeoutMs: 8_000,
      });

      const previewCanvas = await renderPreviewCanvas(opts, pages[pageIndex].variables, imageCache);

      const encoded: EncodedImage = ImageEncoder.encodeCanvas(previewCanvas, label.printDirection);

      await currentTask.printInit();
      await currentTask.printPage(encoded, pages[pageIndex].quantity);

      printState.set("printing");

      const listener = (e: PrintProgressEvent) => {
        const pageRatio = pages[pageIndex].quantity > 0 ? e.page / pages[pageIndex].quantity : 0;
        printProgress.set(Math.floor(pageRatio * ((e.pagePrintProgress + e.pageFeedProgress) / 2)));
      };

      client.on("printprogress", listener);

      try {
        await currentTask.waitForFinished();
      } finally {
        client.off("printprogress", listener);
      }

      await currentTask.printEnd();
      currentTask = undefined;

      if (pageIndex < totalPages - 1) await Utils.sleep(500);
    }
  } catch (e) {
    printError.set(`${e}`);
    console.error(e);
    if (currentTask) {
      try { await currentTask.printEnd(); } catch { /* ignore */ }
      currentTask = undefined;
    }
  } finally {
    printState.set("idle");
    printProgress.set(0);
    startHeartbeat();
  }
};

export const cancelPrint = async (): Promise<void> => {
  if (currentTask) {
    try { await currentTask.printEnd(); } catch { /* ignore */ }
    currentTask = undefined;
  }
  printState.set("idle");
  printProgress.set(0);
  startHeartbeat();
};

export const headSizeWarning = (opts: PrintOptions): string | undefined => {
  const label = get(labelProps);
  const meta = get(printerMeta);
  if (!meta) return undefined;
  const headSize = label.printDirection === "left" ? label.size.height : label.size.width;
  if (headSize > meta.printheadPixels) {
    return `Label ${headSize}px exceeds printhead ${meta.printheadPixels}px`;
  }
  return undefined;
};
