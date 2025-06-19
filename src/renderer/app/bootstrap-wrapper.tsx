import { useConfigsStore } from "@/renderer/stores/configs";
import { areConfigsBootStrapped, BootStrappedConfigs } from "@/renderer/types";
import { memo, ReactNode, useEffect } from "react";
import Loading from "./loading";

const RETRY_LIMIT = 60;
const RETRY_DELAY_MS = 1_000;

async function bootstrap(): Promise<{ configs: BootStrappedConfigs }> {
  for (let i = 0; i < RETRY_LIMIT; i++) {
    const { configs } = await window.electronAPI.getConfigs();

    if (areConfigsBootStrapped(configs)) {
      return { configs };
    }

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }

  throw new Error("Failed to start the app after multiple attempts.");
}

type Props = {
  children: ReactNode;
};

function BootstrapWrapper({ children }: Props) {
  const configsState = useConfigsStore((state) => state.configs);
  const setConfigsState = useConfigsStore((state) => state.setConfigs);

  // bootstrap
  useEffect(() => {
    let current = true;

    if (configsState === null) {
      bootstrap().then((bootstrapResult) => {
        if (!current) {
          return;
        }

        setConfigsState(bootstrapResult.configs);
      });
    }

    return () => {
      current = false;
    };
  }, [configsState, setConfigsState]);

  if (configsState === null) {
    return <Loading />;
  }

  return children;
}

export default memo(BootstrapWrapper);
