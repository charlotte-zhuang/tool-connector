type Args = {
  port: number;
};

export function createClaudeDesktopUsageInstructions({ port }: Args): string {
  return `
Add to \`claude_desktop_config.json\`. Requires \`npx\`.
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

Claude Desktop requires a restart whenever you make changes to your configs.
`.trim();
}

export function createVisualStudioCodeUsageInstructions({
  port,
}: Args): string {
  return `
Add to your settings JSON file or \`.vscode/mcp.json\` (omit "mcp" when adding to \`.vscode/mcp.json\`). Requires \`npx\`.

\`\`\`json
{
  "mcp": {
    "servers": {
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
}
\`\`\`
`.trim();
}

export function createLocalMcpUrlUsageInstructions({ port }: Args): string {
  return `
If your app supports integrating with a local MCP server via a URL, simply provide this URL:

\`\`\`text
http://localhost:${port}/mcp
\`\`\`
`.trim();
}
