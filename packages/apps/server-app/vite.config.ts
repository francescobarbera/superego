import { resolve } from "node:path";
import browserAppViteConfig from "@superego/browser-app/vite.config.js";
import legacy from "@vitejs/plugin-legacy";
import { mergeConfig, type UserConfig } from "vite";

const isLegacyBuild = process.env["SUPEREGO_LEGACY"] === "true";

export default mergeConfig(browserAppViteConfig as UserConfig, {
  plugins: [
    {
      name: "runtime-server-config",
      transformIndexHtml: {
        order: "post",
        handler(_html, context) {
          return context.path === "/index.html"
            ? [
                {
                  tag: "script",
                  attrs: { src: "/config.js" },
                  injectTo: "head-prepend" as const,
                },
              ]
            : [];
        },
      },
    },
    // Lower template literals too: Babel's regenerator cannot handle every
    // template expression retained by an iOS 9 syntax target.
    ...(isLegacyBuild ? [legacy({ targets: ["ios >= 8"] })] : []),
  ],
  define: {
    "import.meta.env.VITE_SANDBOX_URL": "window.superegoConfig.sandboxUrl",
  },
  build: {
    outDir: isLegacyBuild ? "dist/browser-legacy" : "dist/browser",
    // Keep the compatibility prototype quick to rebuild while testing devices.
    minify: isLegacyBuild ? false : "oxc",
    sourcemap: !isLegacyBuild,
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, "index.html"),
        appSandbox: resolve(import.meta.dirname, "app-sandbox.html"),
      },
    },
  },
});
