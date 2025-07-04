import { z } from "zod";

const mcpServerConfigBaseSchema = z.object({
  name: z.string(),
});

const urlMcpServerConfigSchema = mcpServerConfigBaseSchema.extend({
  kind: z.literal("url"),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
});

const commandMcpServerConfigSchema = mcpServerConfigBaseSchema.extend({
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
  port: z.coerce.number().int().min(0).max(65535).optional(),
  mcp_servers: z.array(mcpServerConfigSchema).optional(),
});

export type Configs = z.infer<typeof ConfigsSchema>;
