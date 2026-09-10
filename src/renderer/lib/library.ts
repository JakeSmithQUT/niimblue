import { writable } from "svelte/store";
import { serializeLabel, parseLabel } from "./labelFile";
import { labelProps } from "./label";
import { scene } from "./engine/scene";
import { renderThumbnail } from "./image/rasterize";
import { get } from "svelte/store";
import type { SceneNode } from "./engine/types";
import type { ElectronAPI } from "./electron";

export type LibraryEntry = {
  name: string;
  path: string;
};

export const library = writable<LibraryEntry[]>([]);

const api = (): ElectronAPI | undefined => window.electronAPI;

export const refreshLibrary = async () => {
  const e = api();
  if (!e?.listLibrary) return;
  const list = await e.listLibrary();
  library.set(list);
};

export const saveCurrentLabel = async (title: string) => {
  const e = api();
  if (!e?.saveLabel) return;
  const s = get(scene);
  const label = get(labelProps);
  const thumbnail = await renderThumbnail(label, s.nodes).catch(() => undefined);
  const data = serializeLabel(title, label, s.nodes, thumbnail);
  await e.saveLabel(title, data);
  await refreshLibrary();
};

export const openLabelFile = async () => {
  const e = api();
  if (!e?.openLabel) return;
  const result = await e.openLabel();
  if (!result) return;
  loadFromData(result.data, result.path);
};

export const loadFromData = (raw: string, _path: string) => {
  const parsed = parseLabel(raw);
  if (!parsed) return;
  labelProps.set(parsed.label);
  scene.set({ nodes: parsed.nodes as SceneNode[], selectedId: undefined });
};

export const thumbnailFor = (entry: LibraryEntry): string | undefined => {
  return entryThumbCache.get(entry.path);
};

const entryThumbCache = new Map<string, string>();

export const cacheThumbnail = (path: string, thumb: string): void => {
  entryThumbCache.set(path, thumb);
};

export const deleteLibraryEntry = async (path: string) => {
  const e = api();
  if (!e?.deleteLibraryFile) return;
  await e.deleteLibraryFile(path);
  await refreshLibrary();
};
