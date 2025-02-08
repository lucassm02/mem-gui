/* eslint-disable no-undef */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  publicDir: "asset",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  server: {
    port: 5173,
    historyApiFallback: true
  },
  build: {
    outDir: "dist/public",
    rollupOptions: {
      external: ["src/api", "src/server.ts", "src/utils/backend"]
    }
  }
});
