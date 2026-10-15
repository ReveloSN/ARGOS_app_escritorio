import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Tauri carga la interfaz desde este puerto exacto (tauri.conf.json → devUrl).
const DEV_SERVER_PORT = 1420;
// Motores web que usa Tauri: WebView2 (Chromium) en Windows y WebKitGTK en Linux.
const WINDOWS_WEBVIEW_TARGET = "chrome105";
const LINUX_WEBVIEW_TARGET = "safari13";

const isWindowsBuild = process.env.TAURI_ENV_PLATFORM === "windows";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  server: {
    port: DEV_SERVER_PORT,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  build: {
    target: isWindowsBuild ? WINDOWS_WEBVIEW_TARGET : LINUX_WEBVIEW_TARGET,
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
