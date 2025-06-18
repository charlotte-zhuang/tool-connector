import Markdown from "react-markdown";

type Props = {
  port: number;
};

export default function ClaudeDesktop({ port }: Props) {
  const instructions = `Add to \`claude_desktop_config.json\`. Requires \`npx\`.
\`\`\`json
{
  "mcpServers": {
    "tool-connector": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--streamableHttp",
        "http://localhost:${port}/mcp"
      ]
    }
  }
}
\`\`\`
`;

  return (
    <div>
      <h3>Usage with Claude Desktop</h3>
      <Markdown>{instructions}</Markdown>
    </div>
  );
}
