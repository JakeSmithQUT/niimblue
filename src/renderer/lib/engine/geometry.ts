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

export const handlePoints = (node: SceneNode): Record<HandleId, { x: number; y: number }> => ({
  nw: { x: node.x, y: node.y },
  ne: { x: node.x + node.width, y: node.y },
  sw: { x: node.x, y: node.y + node.height },
  se: { x: node.x + node.width, y: node.y + node.height },
});

export const handleAt = (node: SceneNode, px: number, py: number, viewScale: number): HandleId | undefined => {
  const h = HANDLE_HIT_PX / viewScale;
  const pts = handlePoints(node);
  for (const id of ["nw", "ne", "sw", "se"] as HandleId[]) {
    const p = pts[id];
    if (px >= p.x - h && px <= p.x + h && py >= p.y - h && py <= p.y + h) return id;
  }
  return undefined;
};
