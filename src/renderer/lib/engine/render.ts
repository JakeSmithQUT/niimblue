import type { SceneNode } from "./types";
import { drawQrCode } from "../image/qr";
import { drawBarcode, type BarcodeCoding } from "../image/barcode";
import { drawArUco, type ArUcoDictionary } from "../image/aruco";

const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const applyTransform = (ctx: CanvasRenderingContext2D, node: SceneNode) => {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  ctx.translate(cx, cy);
  if (node.rotation) ctx.rotate((node.rotation * Math.PI) / 180);
  ctx.translate(-node.width / 2, -node.height / 2);
};

const drawText = (ctx: CanvasRenderingContext2D, node: Extract<SceneNode, { kind: "text" }>) => {
  ctx.fillStyle = node.fill;
  ctx.font = `${node.italic ? "italic " : ""}${node.fontWeight} ${node.fontSize}px ${node.fontFamily}`;
  ctx.textBaseline = "top";
  ctx.textAlign = node.align;
  const lineHeight = node.fontSize * node.lineHeight;
  const lines = node.text.split("\n");
  const x = node.align === "center" ? node.width / 2 : node.align === "right" ? node.width : 0;
  lines.forEach((line, i) => ctx.fillText(line, x, i * lineHeight));
};

const drawRect = (ctx: CanvasRenderingContext2D, node: Extract<SceneNode, { kind: "rect" }>) => {
  if (node.fill !== "transparent") {
    ctx.fillStyle = node.fill;
    drawRoundedRect(ctx, 0, 0, node.width, node.height, node.cornerRadius);
    ctx.fill();
  }
  if (node.strokeWidth > 0 && node.stroke !== "transparent") {
    ctx.strokeStyle = node.stroke;
    ctx.lineWidth = node.strokeWidth;
    drawRoundedRect(ctx, 0, 0, node.width, node.height, node.cornerRadius);
    ctx.stroke();
  }
};

const drawEllipse = (ctx: CanvasRenderingContext2D, node: Extract<SceneNode, { kind: "ellipse" }>) => {
  ctx.beginPath();
  ctx.ellipse(node.width / 2, node.height / 2, node.width / 2, node.height / 2, 0, 0, Math.PI * 2);
  if (node.fill !== "transparent") {
    ctx.fillStyle = node.fill;
    ctx.fill();
  }
  if (node.strokeWidth > 0 && node.stroke !== "transparent") {
    ctx.strokeStyle = node.stroke;
    ctx.lineWidth = node.strokeWidth;
    ctx.stroke();
  }
};

const drawLine = (ctx: CanvasRenderingContext2D, node: Extract<SceneNode, { kind: "line" }>) => {
  ctx.strokeStyle = node.stroke;
  ctx.lineWidth = node.strokeWidth;
  ctx.lineCap = "square";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(node.width, 0);
  ctx.stroke();
};

const drawImage = async (ctx: CanvasRenderingContext2D, node: Extract<SceneNode, { kind: "image" }>, cache: Map<string, HTMLImageElement>) => {
  let img = cache.get(node.src);
  if (!img) {
    img = new Image();
    img.src = node.src;
    await new Promise((res, rej) => {
      img!.onload = res;
      img!.onerror = rej;
    });
    cache.set(node.src, img);
  }
  ctx.drawImage(img, 0, 0, node.width, node.height);
};

export const renderNode = async (
  ctx: CanvasRenderingContext2D,
  node: SceneNode,
  imageCache: Map<string, HTMLImageElement>,
): Promise<void> => {
  if (!node.visible) return;
  ctx.save();
  applyTransform(ctx, node);
  switch (node.kind) {
    case "text":
      drawText(ctx, node);
      break;
    case "rect":
      drawRect(ctx, node);
      break;
    case "ellipse":
      drawEllipse(ctx, node);
      break;
    case "line":
      drawLine(ctx, node);
      break;
    case "image":
      await drawImage(ctx, node, imageCache);
      break;
    case "qrcode":
      drawQrCode(ctx, node.width, node.height, node.text, node.ecc);
      break;
    case "barcode":
      drawBarcode(
        ctx,
        node.width,
        node.height,
        node.text,
        (node.encoding === "EAN13" ? "EAN13" : "CODE128B") as BarcodeCoding,
        true,
        1,
        12,
        "sans-serif",
      );
      break;
    case "aruco": {
      const dictKey = (node.size === 5 ? "5x5" : node.size === 6 ? "6x6" : "4x4") as ArUcoDictionary;
      drawArUco(ctx, node.width, node.height, dictKey, node.markerId);
      break;
    }
  }
  ctx.restore();
};

export const renderScene = async (
  ctx: CanvasRenderingContext2D,
  nodes: SceneNode[],
  imageCache: Map<string, HTMLImageElement>,
): Promise<void> => {
  for (const node of nodes) {
    await renderNode(ctx, node, imageCache);
  }
};
