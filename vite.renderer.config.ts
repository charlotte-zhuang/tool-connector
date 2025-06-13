import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  base: "./", // Important for Electron
  build: {
    outDir: "dist-renderer",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
    },
  },
  server: {
    port: 3000,
  },
  // Important for Electron compatibility
  define: {
    global: "globalThis",
  },
});
