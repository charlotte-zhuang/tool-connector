import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useConfigsController } from "@/renderer/controllers/configs";
import { Configs, ConfigsSchema } from "@/shared/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { memo } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";

type Props = {
  configs: Configs;
};

function ConfigsEditor({ configs }: Props) {
  const { setConfigs } = useConfigsController();

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
                  <Input placeholder="Optional. example: 3619" {...field} />
                </FormControl>
                <FormDescription>
                  The port on your computer that Tool Connector will use.
                  Deleting this to reset the port can fix issues sometimes.
                </FormDescription>
                {form.formState.errors.port && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.port.message}
                  </p>
                )}
              </FormItem>
            )}
          />

          <div className="flex gap-2 justify-end w-full">
            <Button type="reset" variant="destructive" size="sm">
              Reset
            </Button>
            <Button type="submit" size="sm">
              Save
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default memo(ConfigsEditor);
