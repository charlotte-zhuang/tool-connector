import { useConfigsStore } from "@/renderer/stores/configs";
import { memo, useState } from "react";
import ConfigsEditor from "./configs-editor";
import UsageInstructions from "./usage-instructions";
import { Button } from "@/components/ui/button";

function Page() {
  const configs = useConfigsStore((state) => state.configs);
  const [showConfigsEditor, setShowConfigsEditor] = useState<boolean>(
    configs !== null && !configs.mcp_servers?.length
  );

  if (configs === null) {
    return null;
  }

  return (
    <div>
      <UsageInstructions />

      <Button
        size="sm"
        variant={showConfigsEditor ? "destructive" : "default"}
        className="mx-8 my-4"
        onClick={() => {
          setShowConfigsEditor((prev) => !prev);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setShowConfigsEditor((prev) => !prev);
          }
        }}
      >
        {showConfigsEditor ? "Hide configs" : "Show configs"}
      </Button>

      {showConfigsEditor && <ConfigsEditor />}
    </div>
  );
}

export default memo(Page);
