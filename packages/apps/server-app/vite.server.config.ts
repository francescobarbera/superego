import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist/server",
    ssr: "src/server/index.ts",
    rollupOptions: {
      output: { assetFileNames: "[name][extname]", codeSplitting: false },
    },
  },
  ssr: {
    noExternal: [/^@superego\//],
  },
  plugins: [
    {
      name: "copy-quickjs-wasm",
      closeBundle() {
        copyFileSync(
          resolve(
            import.meta.dirname,
            "../../../node_modules/@jitl/quickjs-wasmfile-release-sync/dist/emscripten-module.wasm",
          ),
          resolve(import.meta.dirname, "dist/server/emscripten-module.wasm"),
        );
      },
    },
  ],
});
