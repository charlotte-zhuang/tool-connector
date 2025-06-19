import { Configs } from "@/shared/schemas";

export type ElectronApi = {
  getConfigs: () => Promise<
    { configs: Configs; error?: never } | { error: string; configs?: never }
  >;
  setConfigs: (configs: Configs) => Promise<{ error?: string }>;
};

export type ElectronApiChannel = "get-configs" | "set-configs";
