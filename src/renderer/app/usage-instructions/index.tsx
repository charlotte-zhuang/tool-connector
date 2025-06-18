import Markdown from "@/components/markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getConfigs } from "@/renderer/api/configs";
import { use } from "react";
import {
  createClaudeDesktopUsageInstructions,
  createLocalMcpUrlUsageInstructions,
  createVisualStudioCodeUsageInstructions,
} from "./create-usage-instructions";

const RETRY_DELAY_MS = 1_000;
const RETRY_LIMIT = 60;

async function loadPort(): Promise<number> {
  for (let i = 0; i < RETRY_LIMIT; i++) {
    const { port } = await getConfigs();

    if (port !== undefined) {
      return port;
    }

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }

  throw new Error("Failed to load configs.");
}

export default function UsageInstructions() {
  const port = use(loadPort());

  return (
    <div className="flex flex-col my-4 mx-8 gap-2">
      <h2 className="text-lg font-bold">Usage</h2>
      <Tabs defaultValue="claude-desktop" className="min-w-64 max-w-[600px]">
        <TabsList>
          <TabsTrigger value="claude-desktop">Claude Desktop</TabsTrigger>
          <TabsTrigger value="vs-code">VS Code</TabsTrigger>
          <TabsTrigger value="local-mcp-url">Local MCP URL</TabsTrigger>
        </TabsList>

        <TabsContent value="claude-desktop">
          <Markdown>{createClaudeDesktopUsageInstructions({ port })}</Markdown>
        </TabsContent>

        <TabsContent value="vs-code">
          <Markdown>
            {createVisualStudioCodeUsageInstructions({ port })}
          </Markdown>
        </TabsContent>

        <TabsContent value="local-mcp-url">
          <Markdown>{createLocalMcpUrlUsageInstructions({ port })}</Markdown>
        </TabsContent>
      </Tabs>
    </div>
  );
}
