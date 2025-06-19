import { AccordionContent, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  FieldArrayWithId,
  FieldError,
  useFieldArray,
  UseFormReturn,
} from "react-hook-form";
import { FormValue } from "./schema";

type Props = {
  form: UseFormReturn<FormValue>;
  field: FieldArrayWithId<FormValue, "mcp_servers", "id">;
  index: number;
  removeField: (index: number) => void;
};

export default function McpServerFormField({
  form,
  field,
  index,
  removeField,
}: Props) {
  const envFieldArray = useFieldArray({
    control: form.control,
    name: `mcp_servers.${index}.env`,
  });

  const headersFieldArray = useFieldArray({
    control: form.control,
    name: `mcp_servers.${index}.headers`,
  });

  const errors = form.formState.errors.mcp_servers?.[index];
  // i'm not surer how to properly type guard this since there's a discriminated union
  const typeCastedErrors = errors as
    | {
        command?: FieldError;
        url?: FieldError;
        args?: FieldError;
        env?: {
          message?: string;
          key?: FieldError;
          value?: FieldError;
        }[] & { message?: string };
        headers?: {
          message?: string;
          key?: FieldError;
          value?: FieldError;
        }[] & { message?: string };
      }
    | undefined;

  return (
    <Card
      className={cn({
        "border-red-500": errors !== undefined,
      })}
    >
      <CardHeader>
        <FormField
          control={form.control}
          name={`mcp_servers.${index}.name`}
          render={({ field: nameField }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Server Name</FormLabel>
              <FormControl>
                <Input placeholder="Server Name" {...nameField} />
              </FormControl>
            </FormItem>
          )}
        />
        {errors?.name?.message && (
          <p className="text-red-500 text-sm">{errors.name.message}</p>
        )}
        <AccordionTrigger className="text-sm font-medium">
          Server Configs
        </AccordionTrigger>
      </CardHeader>

      <AccordionContent>
        <CardContent>
          <Tabs
            defaultValue={field.kind}
            onValueChange={(newKind) => {
              if (newKind === "command") {
                const env: never[] = [];
                form.setValue(
                  `mcp_servers.${index}`,
                  {
                    kind: "command",
                    name: form.getValues(`mcp_servers.${index}.name`),
                    command: "",
                    env,
                  },
                  {
                    shouldDirty: true,
                    shouldTouch: true,
                  }
                );
                envFieldArray.replace(env);
              } else if (newKind === "url") {
                const headers = [
                  { key: "Content-Type", value: "application/json" },
                ];
                form.setValue(
                  `mcp_servers.${index}`,
                  {
                    kind: "url",
                    name: form.getValues(`mcp_servers.${index}.name`),
                    url: "",
                    headers,
                  },
                  {
                    shouldDirty: true,
                    shouldTouch: true,
                  }
                );
                headersFieldArray.replace(headers);
              }
            }}
          >
            <TabsList>
              <TabsTrigger value="command">Command</TabsTrigger>
              <TabsTrigger value="url">URL</TabsTrigger>
            </TabsList>

            <div
              className={cn("p-4 border-l", {
                "border-red-500": !!errors?.message,
              })}
            >
              {errors?.message && (
                <p className="text-red-500 text-sm">{errors.message}</p>
              )}

              <TabsContent value="command" className="space-y-2">
                {errors?.kind?.message && (
                  <p className="text-red-500 text-sm">{errors.kind.message}</p>
                )}

                <FormField
                  control={form.control}
                  name={`mcp_servers.${index}.command`}
                  render={({ field: commandField }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Command
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Usually npx, uvx, pipx, or docker"
                          className={cn({
                            "text-red-500":
                              !!typeCastedErrors?.command?.message,
                          })}
                          {...commandField}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {typeCastedErrors?.command?.message && (
                  <p className="text-red-500 text-sm">
                    {typeCastedErrors.command.message}
                  </p>
                )}

                <FormField
                  control={form.control}
                  name={`mcp_servers.${index}.args`}
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Args
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Optional. example: -y hello-world"
                          {...form.register(`mcp_servers.${index}.args`)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {typeCastedErrors?.args?.message && (
                  <p className="text-red-500 text-sm">
                    {typeCastedErrors.args.message}
                  </p>
                )}

                <FormField
                  control={form.control}
                  name={`mcp_servers.${index}.env`}
                  render={() => (
                    <div className="flex flex-col gap-2">
                      <label
                        className={cn("text-sm font-medium", {
                          "test-red-500": !!typeCastedErrors?.env?.message,
                        })}
                      >
                        Environment Variables
                      </label>

                      {typeCastedErrors?.env?.message && (
                        <p className="text-red-500 text-sm">
                          {typeCastedErrors.env.message}
                        </p>
                      )}

                      {envFieldArray.fields.map((env, envIndex) => (
                        <div key={env.id}>
                          <div className="flex items-center gap-2">
                            <FormItem className="flex-grow">
                              <FormControl>
                                <Input
                                  placeholder="Key. example: API_KEY"
                                  className={cn({
                                    "text-red-500":
                                      !!typeCastedErrors?.env?.[envIndex]?.key
                                        ?.message,
                                  })}
                                  {...form.register(
                                    `mcp_servers.${index}.env.${envIndex}.key`
                                  )}
                                />
                              </FormControl>
                            </FormItem>
                            {typeCastedErrors?.env?.[envIndex]?.key
                              ?.message && (
                              <p className="text-red-500 text-sm">
                                {typeCastedErrors.env[envIndex].key.message}
                              </p>
                            )}

                            <FormItem className="flex-grow">
                              <FormControl>
                                <Input
                                  placeholder="Value. example: sh_abc123"
                                  className={cn({
                                    "text-red-500":
                                      !!typeCastedErrors?.env?.[envIndex]?.value
                                        ?.message,
                                  })}
                                  {...form.register(
                                    `mcp_servers.${index}.env.${envIndex}.value`
                                  )}
                                />
                              </FormControl>
                            </FormItem>
                            {typeCastedErrors?.env?.[envIndex]?.value
                              ?.message && (
                              <p className="text-red-500 text-sm">
                                {typeCastedErrors.env[envIndex].value.message}
                              </p>
                            )}

                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => envFieldArray.remove(envIndex)}
                            >
                              Remove
                            </Button>
                          </div>
                          {typeCastedErrors?.env?.[envIndex]?.message && (
                            <p className="text-red-500 text-sm">
                              {typeCastedErrors.env[envIndex].message}
                            </p>
                          )}
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          envFieldArray.append({ key: "", value: "" })
                        }
                      >
                        Add environment variable
                      </Button>
                    </div>
                  )}
                />
              </TabsContent>

              <TabsContent value="url" className="space-y-2">
                <FormField
                  control={form.control}
                  name={`mcp_servers.${index}.url`}
                  render={({ field: urlField }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Server URL
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="example: https://example.com/mcp"
                          className={cn({
                            "text-red-500": !!typeCastedErrors?.url?.message,
                          })}
                          {...urlField}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {typeCastedErrors?.url?.message && (
                  <p className="text-red-500 text-sm">
                    {typeCastedErrors.url.message}
                  </p>
                )}

                <FormField
                  control={form.control}
                  name={`mcp_servers.${index}.headers`}
                  render={() => (
                    <div className="flex flex-col gap-2">
                      <label
                        className={cn("text-sm font-medium", {
                          "test-red-500": !!typeCastedErrors?.headers?.message,
                        })}
                      >
                        Headers
                      </label>

                      {typeCastedErrors?.headers?.message && (
                        <p className="text-red-500 text-sm">
                          {typeCastedErrors.headers.message}
                        </p>
                      )}

                      {headersFieldArray.fields.map((header, headerIndex) => (
                        <div key={header.id}>
                          <div className="flex items-center gap-2">
                            <FormItem className="flex-grow">
                              <FormControl>
                                <Input
                                  placeholder="Key. example: Authorization"
                                  className={cn({
                                    "text-red-500":
                                      !!typeCastedErrors?.headers?.[headerIndex]
                                        ?.key?.message,
                                  })}
                                  {...form.register(
                                    `mcp_servers.${index}.headers.${headerIndex}.key`
                                  )}
                                />
                              </FormControl>
                            </FormItem>
                            {typeCastedErrors?.headers?.[headerIndex]?.key
                              ?.message && (
                              <p className="text-red-500 text-sm">
                                {
                                  typeCastedErrors.headers[headerIndex].key
                                    .message
                                }
                              </p>
                            )}

                            <FormItem className="flex-grow">
                              <FormControl>
                                <Input
                                  placeholder="Value. example: Bearer abc123"
                                  className={cn({
                                    "text-red-500":
                                      !!typeCastedErrors?.headers?.[headerIndex]
                                        ?.value?.message,
                                  })}
                                  {...form.register(
                                    `mcp_servers.${index}.headers.${headerIndex}.value`
                                  )}
                                />
                              </FormControl>
                            </FormItem>
                            {typeCastedErrors?.headers?.[headerIndex]?.value
                              ?.message && (
                              <p className="text-red-500 text-sm">
                                {
                                  typeCastedErrors.headers[headerIndex].value
                                    .message
                                }
                              </p>
                            )}

                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                headersFieldArray.remove(headerIndex)
                              }
                            >
                              Remove
                            </Button>
                          </div>
                          {typeCastedErrors?.headers?.[headerIndex]
                            ?.message && (
                            <p className="text-red-500 text-sm">
                              {typeCastedErrors.headers[headerIndex].message}
                            </p>
                          )}
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          headersFieldArray.append({ key: "", value: "" })
                        }
                      >
                        Add header
                      </Button>
                    </div>
                  )}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </AccordionContent>

      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="mx-4 mb-4"
        onClick={() => removeField(index)}
      >
        Remove Server
      </Button>

      {errors !== undefined && (
        <p className="m-4 text-red-500 text-sm">this server has some errors</p>
      )}
    </Card>
  );
}
