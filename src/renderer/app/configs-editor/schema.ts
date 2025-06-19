import { z } from "zod";

const mcpServerConfigBaseSchema = z.object({
  name: z.string().min(1),
});

const urlMcpServerConfigSchema = mcpServerConfigBaseSchema.extend({
  kind: z.literal("url"),
  url: z.string().url(),
  headers: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string(),
    })
  ),
});

const commandMcpServerConfigSchema = mcpServerConfigBaseSchema.extend({
  kind: z.literal("command"),
  command: z.string().min(1),
  args: z.string().optional(),
  env: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string(),
    })
  ),
});

const mcpServerConfigSchema = z.discriminatedUnion("kind", [
  urlMcpServerConfigSchema,
  commandMcpServerConfigSchema,
]);

export const FormSchema = z.object({
  port: z.coerce.number().int().min(0).max(65535).optional(),
  mcp_servers: z.array(mcpServerConfigSchema),
});

export type FormValue = z.infer<typeof FormSchema>;
