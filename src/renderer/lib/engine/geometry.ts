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
  return lx >= 0 && lx <= node.width && ly >= 0 && ly <= node.height;
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

export const boundsIntersect = (a: DOMRect, b: DOMRect) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
