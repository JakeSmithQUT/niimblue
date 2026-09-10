import type { SceneNode } from "./types";

export const nodeContainsPoint = (node: SceneNode, px: number, py: number): boolean => {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const angle = (-node.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = px - cx;
  const dy = py - cy;
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  const hw = node.width / 2;
  const hh = node.height / 2;
  return lx >= -hw && lx <= hw && ly >= -hh && ly <= hh;
};

export const topNodeAt = (nodes: SceneNode[], x: number, y: number): SceneNode | undefined => {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (!node.visible || node.locked) continue;
    if (nodeContainsPoint(node, x, y)) return node;
  }
  return undefined;
};

export const nodeBounds = (node: SceneNode) => ({
  x: node.x,
  y: node.y,
  width: node.width,
  height: node.height,
});

export const HANDLE_HIT_PX = 12;

export type HandleId = "nw" | "ne" | "sw" | "se";

const toLocal = (node: SceneNode, px: number, py: number) => {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const angle = (-node.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = px - cx;
  const dy = py - cy;
  return { x: dx * cos - dy * sin + node.width / 2, y: dx * sin + dy * cos + node.height / 2 };
};

export const handlePoints = (node: SceneNode): Record<HandleId, { x: number; y: number }> => {
  const corners: Record<HandleId, { x: number; y: number }> = {
    nw: { x: 0, y: 0 },
    ne: { x: node.width, y: 0 },
    sw: { x: 0, y: node.height },
    se: { x: node.width, y: node.height },
  };
  if (!node.rotation) return {
    nw: { x: node.x, y: node.y },
    ne: { x: node.x + node.width, y: node.y },
    sw: { x: node.x, y: node.y + node.height },
    se: { x: node.x + node.width, y: node.y + node.height },
  };
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const angle = (node.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const out = {} as Record<HandleId, { x: number; y: number }>;
  for (const id of ["nw", "ne", "sw", "se"] as HandleId[]) {
    const c = corners[id];
    const ox = c.x - node.width / 2;
    const oy = c.y - node.height / 2;
    out[id] = { x: cx + ox * cos - oy * sin, y: cy + ox * sin + oy * cos };
  }
  return out;
};

export const handleAt = (node: SceneNode, px: number, py: number, viewScale: number): HandleId | undefined => {
  const h = HANDLE_HIT_PX / viewScale;
  const local = toLocal(node, px, py);
  for (const id of ["nw", "ne", "sw", "se"] as HandleId[]) {
    const hx = id === "ne" || id === "se" ? node.width : 0;
    const hy = id === "sw" || id === "se" ? node.height : 0;
    if (local.x >= hx - h && local.x <= hx + h && local.y >= hy - h && local.y <= hy + h) return id;
  }
  return undefined;
};
