import { writable, get } from "svelte/store";
import type { SceneNode, NodeKind } from "./types";
import { createNode } from "./factory";

export type SceneState = {
  nodes: SceneNode[];
  selectedId: string | undefined;
};

export const scene = writable<SceneState>({ nodes: [], selectedId: undefined });

type UndoEntry = { nodes: SceneNode[]; selectedId: string | undefined };
const undoStack: UndoEntry[] = [];
const redoStack: UndoEntry[] = [];
const MAX_UNDO = 50;

const snapshot = (): UndoEntry => {
  const s = get(scene);
  return { nodes: structuredClone(s.nodes), selectedId: s.selectedId };
};

const pushUndo = () => {
  undoStack.push(snapshot());
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack.length = 0;
};

export const addNode = (kind: NodeKind): SceneNode => {
  pushUndo();
  const node = createNode(kind);
  const s = get(scene);
  node.x = (s.nodes.length % 5) * 16;
  node.y = (s.nodes.length % 5) * 16;
  scene.update((st) => ({ nodes: [...st.nodes, node], selectedId: node.id }));
  return node;
};

export const addExistingNode = (node: SceneNode) => {
  pushUndo();
  scene.update((st) => ({ nodes: [...st.nodes, node], selectedId: node.id }));
};

export const removeSelected = () => {
  const s = get(scene);
  if (!s.selectedId) return;
  pushUndo();
  scene.update((st) => ({
    nodes: st.nodes.filter((n) => n.id !== st.selectedId),
    selectedId: undefined,
  }));
};

export const duplicateSelected = () => {
  const s = get(scene);
  if (!s.selectedId) return;
  const node = s.nodes.find((n) => n.id === s.selectedId);
  if (!node) return;
  pushUndo();
  const copy = structuredClone(node);
  copy.id = `${node.id}_copy_${Date.now().toString(36)}`;
  copy.x += 16;
  copy.y += 16;
  scene.update((st) => ({ nodes: [...st.nodes, copy], selectedId: copy.id }));
};

export const selectNode = (id: string | undefined) => {
  scene.update((st) => ({ ...st, selectedId: id }));
};

export const updateNode = (id: string, patch: Partial<SceneNode>) => {
  scene.update((st) => ({
    ...st,
    nodes: st.nodes.map((n) => (n.id === id ? ({ ...n, ...patch } as SceneNode) : n)),
  }));
};

export const beginMutation = () => pushUndo();

export const moveNode = (id: string, x: number, y: number) => {
  scene.update((st) => ({
    ...st,
    nodes: st.nodes.map((n) => (n.id === id ? ({ ...n, x, y } as SceneNode) : n)),
  }));
};

export const resizeNode = (id: string, handle: "nw" | "ne" | "sw" | "se", x: number, y: number) => {
  scene.update((st) => ({
    ...st,
    nodes: st.nodes.map((n) => {
      if (n.id !== id) return n;
      const cx = n.x + n.width / 2;
      const cy = n.y + n.height / 2;
      const angle = (-n.rotation * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const dx = x - cx;
      const dy = y - cy;
      const lx = dx * cos - dy * sin + n.width / 2;
      const ly = dx * sin + dy * cos + n.height / 2;

      let left = 0;
      let top = 0;
      let w = n.width;
      let h = n.height;

      if (handle === "nw" || handle === "sw") {
        left = Math.min(lx, n.width - 1);
        w = n.width - left;
      } else {
        w = Math.max(1, lx);
      }
      if (handle === "nw" || handle === "ne") {
        top = Math.min(ly, n.height - 1);
        h = n.height - top;
      } else {
        h = Math.max(1, ly);
      }

      const localOffsetX = left + w / 2 - n.width / 2;
      const localOffsetY = top + h / 2 - n.height / 2;
      const worldOffsetX = localOffsetX * cos + localOffsetY * sin;
      const worldOffsetY = -localOffsetX * sin + localOffsetY * cos;
      return {
        ...n,
        x: cx + worldOffsetX - w / 2,
        y: cy + worldOffsetY - h / 2,
        width: w,
        height: h,
      } as SceneNode;
    }),
  }));
};

export const bringToFront = (id: string) => {
  pushUndo();
  scene.update((st) => {
    const node = st.nodes.find((n) => n.id === id);
    if (!node) return st;
    return { ...st, nodes: [...st.nodes.filter((n) => n.id !== id), node] };
  });
};

export const sendToBack = (id: string) => {
  pushUndo();
  scene.update((st) => {
    const node = st.nodes.find((n) => n.id === id);
    if (!node) return st;
    return { ...st, nodes: [node, ...st.nodes.filter((n) => n.id !== id)] };
  });
};

export const undo = () => {
  if (undoStack.length === 0) return;
  const prev = undoStack.pop()!;
  redoStack.push(snapshot());
  scene.set({ nodes: prev.nodes, selectedId: prev.selectedId });
};

export const redo = () => {
  if (redoStack.length === 0) return;
  const next = redoStack.pop()!;
  undoStack.push(snapshot());
  scene.set({ nodes: next.nodes, selectedId: next.selectedId });
};

export const canUndo = () => undoStack.length > 0;
export const canRedo = () => redoStack.length > 0;
