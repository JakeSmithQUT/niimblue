import { writable } from "svelte/store";

export type ViewId = "design" | "library" | "tools" | "settings";

export const activeView = writable<ViewId>("design");
