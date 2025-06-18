import type Store from "electron-store";
import type { Configs } from "@/shared/schemas";

export type AppStoreValue = { configs: Configs };
export type AppStore = Store<AppStoreValue>;
