import type { SceneNode } from "./types";

export const nodeContainsPoint = (node: SceneNode, px: number, py: number): boolean => {
  const { x, y } = worldToLocal(node, px, py);
  return x >= 0 && x <= node.width && y >= 0 && y <= node.height;
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

export const worldToLocal = (node: SceneNode, px: number, py: number) => {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const angle = (-node.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = px - cx;
  const dy = py - cy;
  return { x: dx * cos - dy * sin + node.width / 2, y: dx * sin + dy * cos + node.height / 2 };
};

export const localToWorld = (node: SceneNode, lx: number, ly: number) => {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const angle = (node.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const ox = lx - node.width / 2;
  const oy = ly - node.height / 2;
  return { x: cx + ox * cos - oy * sin, y: cy + ox * sin + oy * cos };
};

export const handlePoints = (node: SceneNode): Record<HandleId, { x: number; y: number }> => ({
  nw: localToWorld(node, 0, 0),
  ne: localToWorld(node, node.width, 0),
  sw: localToWorld(node, 0, node.height),
  se: localToWorld(node, node.width, node.height),
});

export const handleAt = (node: SceneNode, px: number, py: number, viewScale: number): HandleId | undefined => {
  const h = HANDLE_HIT_PX / viewScale;
  const local = worldToLocal(node, px, py);
  for (const id of ["nw", "ne", "sw", "se"] as HandleId[]) {
    const hx = id === "ne" || id === "se" ? node.width : 0;
    const hy = id === "sw" || id === "se" ? node.height : 0;
    if (local.x >= hx - h && local.x <= hx + h && local.y >= hy - h && local.y <= hy + h) return id;
  }
  return undefined;
};
