import type Store from "electron-store";
import type { Configs } from "@/configs";

export type AppStoreValue = { configs: Configs };
export type AppStore = Store<AppStoreValue>;
