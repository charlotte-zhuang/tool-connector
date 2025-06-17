import { Configs } from "src/configs";

export type ElectronApi = {
  getConfigs: () => Promise<Configs>;
  setConfigs: (configs: Configs) => Promise<void>;
};

export type ElectronApiChannel = "get-configs" | "set-configs";
