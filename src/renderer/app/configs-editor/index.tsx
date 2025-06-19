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
import { getConfigs, setConfigs } from "@/renderer/api/configs";
import { Configs, ConfigsSchema } from "@/shared/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { use } from "react";
import { useForm } from "react-hook-form";

export default function ConfigsEditor() {
  const configs = use(getConfigs());

  const form = useForm<Configs>({
    resolver: zodResolver(ConfigsSchema),
    defaultValues: configs,
  });

  return (
    <div className="flex flex-col my-4 mx-8 gap-2">
      <h2 className="text-lg font-bold">Configs</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(setConfigs)} className="space-y-8">
          <FormField
            control={form.control}
            name="port"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Port</FormLabel>
                <FormControl>
                  <Input placeholder="3123" {...field} />
                </FormControl>
                <FormDescription>
                  The port on your machine that Tool Connector will use.
                </FormDescription>
              </FormItem>
            )}
          />

          <Button type="submit">Save</Button>
        </form>
      </Form>
    </div>
  );
}
