import { create } from "zustand";
import { BootStrappedConfigs } from "@/renderer/types";

type ConfigsStoreState = {
  configs: BootStrappedConfigs | null;
  setConfigs: (configs: BootStrappedConfigs | null) => void;
};

export const useConfigsStore = create<ConfigsStoreState>()((set) => ({
  configs: null,
  setConfigs: (configs) => set({ configs }),
}));
