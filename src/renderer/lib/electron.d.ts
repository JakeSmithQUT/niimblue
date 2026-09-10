export type ElectronAPI = {
  platform: string;
  isPackaged: boolean;
  onMenuAction: (cb: (action: string) => void) => () => void;
  openLabel: () => Promise<{ path: string; data: string } | null>;
  saveLabel: (name: string, data: string) => Promise<string | null>;
  listLibrary: () => Promise<{ name: string; path: string }[]>;
  loadLibraryFile: (path: string) => Promise<string | null>;
  deleteLibraryFile: (path: string) => Promise<boolean>;
  chooseLibraryFolder: () => Promise<string | null>;
};

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
