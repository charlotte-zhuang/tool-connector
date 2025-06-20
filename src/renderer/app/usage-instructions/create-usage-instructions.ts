type Args = {
  port: number;
};

export function createClaudeDesktopUsageInstructions({ port }: Args): string {
  return `
Install \`npx\` if needed, then add this to your \`claude_desktop_config.json\`.

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
Install \`npx\` if needed.

In VS Code, Press CMD+Shift+P (or Ctrl+Shift+P on Windows/Linux) and type "MCP: Add Server".

Select Command (stdio) and enter this command:

\`\`\`text

npx supergateway --streamableHttp http://localhost:${port}/mcp
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
