import { writable } from "svelte/store";

export type ViewId = "design" | "library" | "settings";

export const activeView = writable<ViewId>("design");
