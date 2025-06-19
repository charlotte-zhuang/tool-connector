import { useConfigsStore } from "@/renderer/stores/configs";
import { memo } from "react";
import ConfigsEditor from "./configs-editor";
import UsageInstructions from "./usage-instructions";

function Page() {
  const configs = useConfigsStore((state) => state.configs);

  if (configs === null) {
    return null;
  }

  return (
    <div>
      <UsageInstructions />

      <ConfigsEditor configs={configs} />
    </div>
  );
}

export default memo(Page);
