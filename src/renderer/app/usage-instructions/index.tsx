import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Markdown from "react-markdown";

export default function UsageInstructions() {
  return (
    <div className="flex flex-col m-4">
      <h2>Usage</h2>
      <Tabs defaultValue="claude-desktop" className="w-[400px]">
        <TabsList>
          <TabsTrigger value="claude-desktop">Claude Desktop</TabsTrigger>
          <TabsTrigger value="vs-code">VS Code</TabsTrigger>
        </TabsList>
        <TabsContent value="claude-desktop">
          <Markdown>todo</Markdown>
        </TabsContent>
        <TabsContent value="vs-code">
          <Markdown>todo</Markdown>
        </TabsContent>
      </Tabs>
    </div>
  );
}
