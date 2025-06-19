import type Store from "electron-store";
import type { Configs } from "@/shared/schemas";
import { safeStorage } from "electron";

export type AppStoreValue = {
  configs:
    | (Configs & { isEncrypted?: false })
    | { isEncrypted: true; encryptedValue: string };
};
export type AppStore = Store<AppStoreValue>;

export function getConfigsFromStore(store: AppStore): Configs {
  const rawConfigs = store.get("configs");
  if (rawConfigs.isEncrypted) {
    return JSON.parse(
      safeStorage.decryptString(
        Buffer.from(rawConfigs.encryptedValue, "base64")
      )
    );
  }

  return rawConfigs;
}

export function setConfigsInStore(store: AppStore, configs: Configs): void {
  if (safeStorage.isEncryptionAvailable()) {
    store.set("configs", {
      isEncrypted: true,
      encryptedValue: safeStorage
        .encryptString(JSON.stringify(configs))
        .toString("base64"),
    });
  } else {
    store.set("configs", configs);
  }
}
