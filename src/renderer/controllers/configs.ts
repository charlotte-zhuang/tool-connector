import { useConfigsStore } from "@/renderer/stores/configs";
import { areConfigsBootStrapped } from "@/renderer/types";
import { ElectronApi } from "@/shared/api";
import { Configs } from "@/shared/schemas";
import { useCallback, useMemo } from "react";
import { toast } from "react-toastify";

type ConfigsOrError =
  | { configs: Configs; error?: never }
  | { error?: string; configs?: never };

/**
 * global variable used to serialize reads and writes to electronAPI
 */
var configsPromise: Promise<ConfigsOrError> | null = null;

export function useConfigsController(): {
  setConfigs: (configs: Configs) => Promise<ConfigsOrError>;
} {
  const setConfigsState = useConfigsStore((state) => state.setConfigs);

  const setConfigs = useCallback(
    (newConfigs: Configs): Promise<ConfigsOrError> => {
      const setStateCallback = ({
        error,
      }: Awaited<ReturnType<ElectronApi["setConfigs"]>>) => {
        if (error) {
          toast.error(error, {
            autoClose: false,
          });
          return { error };
        }

        setConfigsState(areConfigsBootStrapped(newConfigs) ? newConfigs : null);
        return { configs: newConfigs };
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
