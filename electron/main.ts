import { app, BrowserWindow, shell, Menu, ipcMain, dialog } from "electron";
import { join } from "node:path";
import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync, mkdirSync } from "node:fs";

const isDev = !app.isPackaged;

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#0b0d10",
    title: "Niimblue Studio",
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(join(__dirname, "../dist/index.html"));
  }
};

const sendAction = (action: string) => {
  const win = BrowserWindow.getFocusedWindow();
  win?.webContents.send("menu-action", action);
};

const buildMenu = () => {
  const isMac = process.platform === "darwin";

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New label",
          accelerator: "CmdOrCtrl+N",
          click: () => sendAction("new"),
        },
        {
          label: "Open label...",
          accelerator: "CmdOrCtrl+O",
          click: () => sendAction("open"),
        },
        {
          label: "Save label...",
          accelerator: "CmdOrCtrl+S",
          click: () => sendAction("save"),
        },
        { type: "separator" },
        {
          label: "Print...",
          accelerator: "CmdOrCtrl+P",
          click: () => sendAction("print"),
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        {
          label: "Undo",
          accelerator: "CmdOrCtrl+Z",
          click: () => sendAction("undo"),
        },
        {
          label: "Redo",
          accelerator: "CmdOrCtrl+Shift+Z",
          click: () => sendAction("redo"),
        },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "zoom" }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template as Electron.MenuItemConstructorOptions[]));
};

const libraryDir = () => join(app.getPath("userData"), "labels");
const ensureLibraryDir = () => {
  const dir = libraryDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
};

const LABEL_FILTERS = [{ name: "Niimblue label", extensions: ["nbl"] }];

ipcMain.handle("label:open", async () => {
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(win!, {
    filters: LABEL_FILTERS,
    properties: ["openFile"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const path = result.filePaths[0];
  return { path, data: readFileSync(path, "utf8") };
});

ipcMain.handle("label:save", async (_e, name: string, data: string) => {
  const win = BrowserWindow.getFocusedWindow();
  const safe = name.replace(/[^a-zA-Z0-9-_ ]/g, "_");
  const result = await dialog.showSaveDialog(win!, {
    defaultPath: `${safe}.nbl`,
    filters: LABEL_FILTERS,
  });
  if (result.canceled || !result.filePath) return null;
  writeFileSync(result.filePath, data, "utf8");
  return result.filePath;
});

ipcMain.handle("library:list", async () => {
  ensureLibraryDir();
  try {
    const files = readdirSync(libraryDir()).filter((f) => f.endsWith(".nbl"));
    return files.map((f) => ({ name: f.replace(/\.nbl$/, ""), path: join(libraryDir(), f) }));
  } catch {
    return [];
  }
});

ipcMain.handle("library:load", async (_e, path: string) => {
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
});

ipcMain.handle("library:delete", async (_e, path: string) => {
  if (existsSync(path)) unlinkSync(path);
  return true;
});

ipcMain.handle("library:chooseFolder", async () => {
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(win!, { properties: ["openDirectory"] });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
