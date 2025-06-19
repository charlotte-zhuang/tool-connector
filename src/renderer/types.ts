import type { Configs } from "@/shared/schemas";

/**
 * Configs with port required since that happens shortly after the app starts.
 */
export type BootStrappedConfigs = Configs & Required<Pick<Configs, "port">>;

export function areConfigsBootStrapped(
  configs: Configs | null | undefined
): configs is BootStrappedConfigs {
  return configs != null && configs.port !== undefined && configs.port > 0;
}
