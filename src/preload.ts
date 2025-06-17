// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";
import type { Configs } from "./configs";
import type { ElectronApi, ElectronApiChannel } from "./api";

contextBridge.exposeInMainWorld("electronAPI", {
  getConfigs: (): Promise<Configs> =>
    ipcRenderer.invoke("get-configs" satisfies ElectronApiChannel),
  setConfigs: (configs: Configs): Promise<void> =>
    ipcRenderer.invoke("set-configs" satisfies ElectronApiChannel, configs),
} satisfies ElectronApi);
