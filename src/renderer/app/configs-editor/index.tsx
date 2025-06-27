import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useConfigsController } from "@/renderer/controllers/configs";
import { useConfigsStore } from "@/renderer/stores/configs";
import { Configs } from "@/shared/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { memo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { parse as parseShell, quote as toShell } from "shell-quote";
import McpServerFormField from "./mcp-server-form-field";
import { FormSchema, FormValue } from "./schema";

function createDefaultValues(configs: Configs | null): FormValue {
  return {
    port: configs?.port ?? undefined,
    mcp_servers: (configs?.mcp_servers ?? []).map((mcpServer) => {
      if (mcpServer.kind === "command") {
        return {
          ...mcpServer,
          args: toShell(mcpServer.args ?? []),
          env: Object.entries(mcpServer.env ?? {}).map(([key, value]) => ({
            key,
            value,
          })),
        };
      }

      return {
        ...mcpServer,
        headers: Object.entries(mcpServer.headers ?? {}).map(
          ([key, value]) => ({
            key,
            value,
          })
        ),
      };
    }),
  };
}

function ConfigsEditor() {
  const originalConfigs = useConfigsStore((state) => state.configs);
  const { setConfigs } = useConfigsController();

  const form = useForm<FormValue>({
    resolver: zodResolver(FormSchema),
    defaultValues: createDefaultValues(originalConfigs),
  });

  const mcpServersFieldArray = useFieldArray({
    control: form.control,
    name: "mcp_servers",
  });

  const submitForm = (values: FormValue): void => {
    const mcpServers: Required<Configs>["mcp_servers"] = [];
    let hasError = false;

    for (const [index, mcpServer] of values.mcp_servers.entries()) {
      const serverName = mcpServer.name.replaceAll(/[^a-zA-Z0-9_-]/g, "");

      if (serverName.length === 0) {
        form.setError(
          `mcp_servers.${index}.name`,
          {
            type: "manual",
            message: "must contain valid characters (a-z, A-Z, 0-9, _, -)",
          },
          { shouldFocus: true }
        );
        hasError = true;
      } else if (mcpServers.some((s) => s.name === serverName)) {
        form.setError(
          `mcp_servers.${index}.name`,
          {
            type: "manual",
            message: `must be unique (duplicate: ${serverName})`,
          },
          { shouldFocus: true }
        );
        hasError = true;
      }

      if (mcpServer.kind === "command") {
        const command = mcpServer.command.trim();

        if (command.length === 0) {
          form.setError(
            `mcp_servers.${index}.command`,
            {
              type: "manual",
              message: "cannot be empty",
            },
            { shouldFocus: true }
          );
          hasError = true;
        }

        const env: Record<string, string> = {};
        for (const [envIndex, envEntry] of mcpServer.env.entries()) {
          const key = envEntry.key.trim();
          if (key.length === 0) {
            form.setError(
              `mcp_servers.${index}.env.${envIndex}.key`,
              {
                type: "manual",
                message: "cannot be empty",
              },
              { shouldFocus: true }
            );
            hasError = true;
          } else if (key in env) {
            form.setError(
              `mcp_servers.${index}.env.${envIndex}.key`,
              {
                type: "manual",
                message: "must be unique",
              },
              { shouldFocus: true }
            );
            hasError = true;
          }

          env[key] = envEntry.value;
        }

        mcpServers.push({
          kind: mcpServer.kind,
          name: serverName,
          command,
          args: mcpServer.args
            ? parseShell(mcpServer.args).map((parseEntry) =>
                parseEntry.toString()
              )
            : [],
          env: Object.fromEntries(
            mcpServer.env.map((e) => [e.key.trim(), e.value])
          ),
        });
      } else {
        const headers: Record<string, string> = {};

        for (const [headerIndex, headerEntry] of mcpServer.headers.entries()) {
          const key = headerEntry.key.trim();
          if (key.length === 0) {
            form.setError(
              `mcp_servers.${index}.headers.${headerIndex}.key`,
              {
                type: "manual",
                message: "cannot be empty",
              },
              { shouldFocus: true }
            );
            hasError = true;
          } else if (key in headers) {
            form.setError(
              `mcp_servers.${index}.headers.${headerIndex}.key`,
              {
                type: "manual",
                message: "must be unique",
              },
              { shouldFocus: true }
            );
            hasError = true;
          }

          headers[key] = headerEntry.value;
        }

        mcpServers.push({ ...mcpServer, name: serverName, headers });
      }
    }

    if (!hasError) {
      setConfigs({
        port: values.port,
        mcp_servers: mcpServers,
      }).then((setConfigsResult) => {
        if (setConfigsResult.configs) {
          form.reset(createDefaultValues(setConfigsResult.configs));
        }
      });
    }
  };

  return (
    <div className="flex flex-col my-4 mx-8 gap-2 pb-[68px]">
      <h2 className="text-lg font-bold">Configs</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submitForm)} className="space-y-8">
          <FormField
            control={form.control}
            name="port"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Port</FormLabel>
                <FormControl>
                  <Input placeholder="Optional. example: 3619" {...field} />
                </FormControl>
                <FormDescription>
                  The port on your computer that Tool Connector will use.
                  Deleting this to reset the port can fix issues sometimes.
                </FormDescription>
                {form.formState.errors.port?.message && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.port.message}
                  </p>
                )}
              </FormItem>
            )}
          />

          <h3
            className={cn({
              "text-red-500": !!form.formState.errors.mcp_servers?.message,
            })}
          >
            MCP Servers
          </h3>
          <Accordion type="multiple" className="space-y-4">
            {mcpServersFieldArray.fields.map((field, index) => (
              <AccordionItem value={field.id} key={field.id}>
                <McpServerFormField
                  form={form}
                  field={field}
                  index={index}
                  removeField={mcpServersFieldArray.remove}
                />
              </AccordionItem>
            ))}
          </Accordion>

          {form.formState.errors.mcp_servers?.message && (
            <p className="text-red-500 text-sm">
              {form.formState.errors.mcp_servers.message}
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() =>
              mcpServersFieldArray.append({
                kind: "command",
                name: "",
                command: "",
                env: [],
              })
            }
          >
            Add an MCP server
          </Button>

          {Object.values(form.formState.dirtyFields).some(Boolean) && (
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex gap-2 justify-end">
              <Button
                type="reset"
                variant="destructive"
                size="sm"
                onClick={() => form.reset()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    form.reset();
                  }
                }}
              >
                Reset
              </Button>
              <Button type="submit" size="sm">
                Save
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}

export default memo(ConfigsEditor);
