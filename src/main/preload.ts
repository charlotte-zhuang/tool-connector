// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import type { ElectronApi, ElectronApiChannel } from "@/shared/api";
import type { Configs } from "@/shared/schemas";
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  getConfigs: (): Promise<{ configs: Configs } | { error: string }> =>
    ipcRenderer.invoke("get-configs" satisfies ElectronApiChannel),
  setConfigs: (configs: Configs): Promise<{ error?: string }> =>
    ipcRenderer.invoke("set-configs" satisfies ElectronApiChannel, configs),
} satisfies ElectronApi);
