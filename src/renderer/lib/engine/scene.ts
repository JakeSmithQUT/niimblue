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
      let { x: nx, y: ny, width: w, height: h } = n;
      if (handle === "nw" || handle === "sw") {
        const right = nx + w;
        nx = Math.min(x, right - 1);
        w = right - nx;
      } else {
        const left = nx;
        const maxW = Math.max(1, x - left);
        w = maxW;
      }
      if (handle === "nw" || handle === "ne") {
        const bottom = ny + h;
        ny = Math.min(y, bottom - 1);
        h = bottom - ny;
      } else {
        const top = ny;
        const maxH = Math.max(1, y - top);
        h = maxH;
      }
      return { ...n, x: nx, y: ny, width: w, height: h } as SceneNode;
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
