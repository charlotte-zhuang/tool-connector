import { useConfigsStore } from "@/renderer/stores/configs";
import { areConfigsBootStrapped } from "@/renderer/types";
import { Configs } from "@/shared/schemas";
import { useCallback, useMemo } from "react";

/**
 * global variable used to serialize reads and writes to electronAPI
 */
var configsPromise: Promise<Configs> | null = null;

export function useConfigsController(): {
  setConfigs: (configs: Configs) => Promise<Configs>;
} {
  const setConfigsState = useConfigsStore((state) => state.setConfigs);

  const setConfigs = useCallback(
    (newConfigs: Configs): Promise<Configs> => {
      const setStateCallback = () => {
        setConfigsState(areConfigsBootStrapped(newConfigs) ? newConfigs : null);
        return newConfigs;
      };

      if (configsPromise === null) {
        configsPromise = window.electronAPI
          .setConfigs(newConfigs)
          .then(setStateCallback);
      } else {
        configsPromise = configsPromise.then(() =>
          window.electronAPI.setConfigs(newConfigs).then(setStateCallback)
        );
      }

      return configsPromise;
    },
    [setConfigsState]
  );

  return useMemo(() => ({ setConfigs }), [setConfigs]);
}
