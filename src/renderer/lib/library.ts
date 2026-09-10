import { writable } from "svelte/store";
import { serializeLabel, parseLabel } from "./labelFile";
import { labelProps } from "./label";
import { scene } from "./engine/scene";
import { get } from "svelte/store";
import type { SceneNode } from "./engine/types";

export type LibraryEntry = {
  name: string;
  path: string;
};

export const library = writable<LibraryEntry[]>([]);

const api = () => (window as any).electronAPI;

export const refreshLibrary = async () => {
  if (!api()?.listLibrary) return;
  const list = (await api().listLibrary()) as LibraryEntry[];
  library.set(list);
};

export const saveCurrentLabel = async (title: string) => {
  if (!api()?.saveLabel) return;
  const s = get(scene);
  const data = serializeLabel(title, get(labelProps), s.nodes);
  await api().saveLabel(title, data);
  await refreshLibrary();
};

export const openLabelFile = async () => {
  if (!api()?.openLabel) return;
  const result = await api().openLabel();
  if (!result) return;
  loadFromData(result.data, result.path);
};

export const loadFromData = (raw: string, _path: string) => {
  const parsed = parseLabel(raw);
  if (!parsed) return;
  labelProps.set(parsed.label);
  scene.set({ nodes: parsed.nodes as SceneNode[], selectedId: undefined });
};

export const deleteLibraryEntry = async (path: string) => {
  if (!api()?.deleteLibraryFile) return;
  await api().deleteLibraryFile(path);
  await refreshLibrary();
};
