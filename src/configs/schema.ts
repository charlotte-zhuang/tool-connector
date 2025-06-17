import { z } from "zod";

const urlMcpServerConfigSchema = z.object({
  kind: z.literal("url"),
  url: z.string().url(),
});

const commandMcpServerConfigSchema = z.object({
  kind: z.literal("command"),
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
});

const mcpServerConfigSchema = z.discriminatedUnion("kind", [
  urlMcpServerConfigSchema,
  commandMcpServerConfigSchema,
]);

export const ConfigsSchema = z.object({
  port: z.number().int().min(1).max(65535).optional(),
  mcp_servers: z.array(mcpServerConfigSchema).optional(),
});

export type Configs = z.infer<typeof ConfigsSchema>;
