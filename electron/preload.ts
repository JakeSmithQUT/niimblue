import { contextBridge, ipcRenderer } from "electron";

const api = {
  platform: process.platform,
  isPackaged: (process as unknown as { defaultApp?: string }).defaultApp !== undefined,
  onMenuAction: (cb: (action: string) => void) => {
    const handler = (_e: unknown, action: string) => cb(action);
    ipcRenderer.on("menu-action", handler);
    return () => ipcRenderer.off("menu-action", handler);
  },
  openLabel: () => ipcRenderer.invoke("label:open"),
  saveLabel: (name: string, data: string) => ipcRenderer.invoke("label:save", name, data),
  listLibrary: () => ipcRenderer.invoke("library:list"),
  loadLibraryFile: (path: string) => ipcRenderer.invoke("library:load", path),
  deleteLibraryFile: (path: string) => ipcRenderer.invoke("library:delete", path),
  chooseLibraryFolder: () => ipcRenderer.invoke("library:chooseFolder"),
};

contextBridge.exposeInMainWorld("electronAPI", api);

export type ElectronAPI = typeof api;
