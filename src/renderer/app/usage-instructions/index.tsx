import Markdown from "@/components/markdown";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfigsStore } from "@/renderer/stores/configs";
import { memo } from "react";
import {
  createClaudeDesktopUsageInstructions,
  createLocalMcpUrlUsageInstructions,
  createVisualStudioCodeUsageInstructions,
} from "./create-usage-instructions";
import Layout from "./layout";

function UsageInstructions() {
  const configs = useConfigsStore((state) => state.configs);

  if (configs === null) {
    return (
      <Layout className="h-[432px]">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-48 w-full" />
      </Layout>
    );
  }

  return (
    <Layout>
      <Tabs defaultValue="claude-desktop" className="min-w-64 max-w-[600px]">
        <TabsList>
          <TabsTrigger value="claude-desktop">Claude Desktop</TabsTrigger>
          <TabsTrigger value="vs-code">VS Code</TabsTrigger>
          <TabsTrigger value="local-mcp-url">Local MCP URL</TabsTrigger>
        </TabsList>

        <TabsContent value="claude-desktop">
          <Markdown>{createClaudeDesktopUsageInstructions(configs)}</Markdown>
        </TabsContent>

        <TabsContent value="vs-code">
          <Markdown>
            {createVisualStudioCodeUsageInstructions(configs)}
          </Markdown>
        </TabsContent>

        <TabsContent value="local-mcp-url">
          <Markdown>{createLocalMcpUrlUsageInstructions(configs)}</Markdown>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}

export default memo(UsageInstructions);
