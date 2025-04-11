/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [
    vue(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: "electron/main.ts",
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, "electron/preload.ts"),
      },
      // Ployfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer:
        process.env.NODE_ENV === "test" ?
          // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
          undefined
        : {},
    }),
  ],
  // fix bizarre awful vite bug
  // see also:
  // https://github.com/neo4j-devtools/nvl-boilerplates/blob/main/plain-js/vite/package.json
  // https://github.com/vitejs/vite/discussions/17738
  // https://vite.dev/config/dep-optimization-options
  optimizeDeps: {
    exclude: ["@neo4j-nvl/layout-workers"],
    include: [
      "@neo4j-nvl/layout-workers > cytoscape",
      "@neo4j-nvl/layout-workers > cytoscape-cose-bilkent",
      "@neo4j-nvl/layout-workers > @neo4j-bloom/dagre",
      "@neo4j-nvl/layout-workers > bin-pack",
      "@neo4j-nvl/layout-workers > graphlib",
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    coverage: {
      provider: "v8",
      include: ["electron/**", "src/**"],
      reporter: ["text", "lcov"],
      thresholds: {
        // these are  kinda arbitrary
        functions: 40,
        branches: 40,
        statements: 40,
        autoUpdate: true,
      },
    },
  },
});
