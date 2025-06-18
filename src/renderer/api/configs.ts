import { Configs } from "@/shared/schemas";

/**
 * global variable used to serialize reads and writes to electronAPI
 */
var configsPromise: Promise<Configs> | null = null;

export function getConfigs(): Promise<Configs> {
  if (configsPromise === null) {
    configsPromise = window.electronAPI.getConfigs();
  }

  return configsPromise;
}

export function setConfigs(configs: Configs): Promise<Configs> {
  if (configsPromise === null) {
    configsPromise = window.electronAPI.setConfigs(configs).then(() => configs);
  } else {
    configsPromise = configsPromise.then(() =>
      window.electronAPI.setConfigs(configs).then(() => configs)
    );
  }

  return configsPromise;
}
