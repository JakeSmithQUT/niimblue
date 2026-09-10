import { renderScene } from "../engine/render";
import type { SceneNode, TextNode } from "../engine/types";
import type { LabelProps } from "../label";

export type RasterResult = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
};

export const renderLabelToCanvas = async (
  label: LabelProps,
  nodes: SceneNode[],
  imageCache: Map<string, HTMLImageElement>,
  variables?: Record<string, string>,
): Promise<RasterResult> => {
  const canvas = document.createElement("canvas");
  canvas.width = label.size.width;
  canvas.height = label.size.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let sceneNodes = nodes;
  if (variables) {
    sceneNodes = nodes.map((n) => {
      if (n.kind !== "text") return n;
      const t = n as TextNode;
      return { ...t, text: substituteVars(t.text, variables) } as TextNode;
    });
  }

  await renderScene(ctx, sceneNodes, imageCache);
  return { canvas, ctx };
};

const substituteVars = (text: string, vars: Record<string, string>): string =>
  text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? "");

export const renderThumbnail = async (
  label: LabelProps,
  nodes: SceneNode[],
  maxDim = 160,
): Promise<string> => {
  const cache = new Map<string, HTMLImageElement>();
  const { canvas, ctx } = await renderLabelToCanvas(label, nodes, cache);
  const scale = Math.min(1, maxDim / Math.max(canvas.width, canvas.height));
  const thumb = document.createElement("canvas");
  thumb.width = Math.max(1, Math.round(canvas.width * scale));
  thumb.height = Math.max(1, Math.round(canvas.height * scale));
  const tctx = thumb.getContext("2d")!;
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(canvas, 0, 0, thumb.width, thumb.height);
  return thumb.toDataURL("image/png");
};
