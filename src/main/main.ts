import type { ElectronApi, ElectronApiChannel } from "@/shared/api";
import { Configs } from "@/shared/schemas";
import { createServer } from "@/main/server";
import {
  getConfigsFromStore,
  setConfigsInStore,
  type AppStoreValue,
} from "@/main/store";
import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from "electron";
import started from "electron-squirrel-startup";
import Store from "electron-store";
import path from "node:path";

const store = new Store<AppStoreValue>({
  defaults: { configs: {} },
});

let cleanupServer: ReturnType<typeof createServer> | null = null;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// IPC handlers

function handleGetConfigs(): { configs: Configs } | { error: string } {
  try {
    return { configs: getConfigsFromStore(store) };
  } catch {
    // reset configs on error
    return { error: "Failed to retrieve configs" };
  }
}

function handleSetConfigs(
  _event: IpcMainInvokeEvent,
  configs: Configs
): { error?: string } {
  try {
    setConfigsInStore(store, configs);
  } catch {
    return { error: "Failed to save configs" };
  }

  try {
    cleanupServer?.();
    cleanupServer = createServer({ store });
  } catch {
    return { error: "Failed to restart server" };
  }

  return {};
}

// Setup

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);

    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  cleanupServer?.();
  cleanupServer = createServer({ store });
}

type MaybeAwaited<T> = T extends Promise<unknown> ? T | Awaited<T> : T;

type ElectronApiHandler<T extends keyof ElectronApi> = (
  event: IpcMainInvokeEvent,
  ...args: Parameters<ElectronApi[T]>
) => MaybeAwaited<ReturnType<ElectronApi[T]>>;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  // Register IPC handlers
  ipcMain.handle(
    "get-configs" satisfies ElectronApiChannel,
    handleGetConfigs satisfies ElectronApiHandler<"getConfigs">
  );

  ipcMain.handle(
    "set-configs" satisfies ElectronApiChannel,
    handleSetConfigs satisfies ElectronApiHandler<"setConfigs">
  );

  // Create the browser window.
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }

  cleanupServer?.();
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
