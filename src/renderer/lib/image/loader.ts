import type { SceneNode } from "../engine/types";

export type ImageEntry = {
  img: HTMLImageElement;
  loaded: boolean;
};

const cache = new Map<string, ImageEntry>();
const listeners = new Set<(src: string) => void>();

export const getImage = (src: string): ImageEntry | undefined => cache.get(src);

export const loadImage = (src: string): ImageEntry => {
  let entry = cache.get(src);
  if (entry) return entry;
  const img = new Image();
  entry = { img, loaded: false };
  cache.set(src, entry);
  img.onload = () => {
    entry!.loaded = true;
    for (const l of listeners) l(src);
  };
  img.onerror = () => {
    entry!.loaded = true;
    for (const l of listeners) l(src);
  };
  img.src = src;
  return entry;
};

export const onImageLoaded = (fn: (src: string) => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const preloadImages = async (nodes: SceneNode[]): Promise<void> => {
  const srcs = nodes.filter((n): n is Extract<SceneNode, { kind: "image" }> => n.kind === "image").map((n) => n.src);
  await Promise.all(
    srcs.map(
      (src) =>
        new Promise<void>((resolve) => {
          const entry = loadImage(src);
          if (entry.loaded) return resolve();
          const off = onImageLoaded((s) => {
            if (s === src) {
              off();
              resolve();
            }
          });
        }),
    ),
  );
};

export const hasUnloadedImages = (nodes: SceneNode[]): boolean =>
  nodes.some((n) => n.kind === "image" && !getImage(n.src)?.loaded);
