import { resolve } from "node:path";
import browserAppViteConfig from "@superego/browser-app/vite.config.js";
import legacy from "@vitejs/plugin-legacy";
import { mergeConfig, type UserConfig } from "vite";

const isLegacyBuild = process.env["SUPEREGO_LEGACY"] === "true";

export default mergeConfig(browserAppViteConfig as UserConfig, {
  plugins: [
    ...(isLegacyBuild
      ? [
          {
            name: "legacy-browser-dependencies",
            enforce: "pre" as const,
            transform(code: string, identifier: string) {
              if (
                /\/react-aria\/dist\/private\/interactions\/use(Press|Hover|InteractOutside|FocusVisible|Move)\.mjs$/.test(
                  identifier,
                )
              ) {
                // React Aria retains mouse/touch handlers for its tests, but
                // removes them from production. iOS 9 needs those handlers
                // because it has no PointerEvent implementation.
                const transformedCode = code
                  .replaceAll(
                    "else if (process.env.NODE_ENV === 'test')",
                    "else",
                  )
                  .replaceAll(
                    "typeof PointerEvent === 'undefined' && process.env.NODE_ENV === 'test'",
                    "typeof PointerEvent === 'undefined'",
                  )
                  // Safari 9 has neither composedPath nor Shadow DOM. Outside
                  // presses can use ordinary containment on that browser.
                  .replace(
                    "return !event.composedPath().includes(ref.current);",
                    "return event.composedPath ? !event.composedPath().includes(ref.current) : !ref.current.contains(target);",
                  );
                if (transformedCode === code) {
                  throw new Error(
                    "React Aria interaction fallback changed; review legacy compatibility",
                  );
                }
                return transformedCode;
              }
              if (
                identifier.endsWith("/urlpattern-polyfill/dist/urlpattern.js")
              ) {
                // esbuild's keepNames helper tries to redefine function names,
                // which are non-configurable on Safari 9. Names are cosmetic.
                return (
                  code
                    .replace('Pe(e,"name",{value:t,configurable:!0})', "e")
                    // Internal route patterns operate on percent-encoded URLs.
                    // Safari 9 cannot construct Unicode-mode RegExp instances.
                    .replace(
                      'e&&e.ignoreCase?"ui":"u"',
                      'e&&e.ignoreCase?"i":""',
                    )
                );
              }
              if (
                !identifier.endsWith(
                  "/react-aria-components/dist/private/utils.mjs",
                )
              ) {
                return;
              }
              if (!code.includes("new Proxy({}, {")) {
                throw new Error(
                  "React Aria DOM factory changed; review legacy compatibility",
                );
              }
              // React Aria uses this Proxy only to lazily construct DOM components.
              // Explicit getters preserve that behavior for its finite set of tags.
              return code.replace(
                "new Proxy({}, {",
                `new (function(target, handler) {
              var components = {};
              "a button div form header input kbd label li ol output section span table tbody td textarea tfoot th thead tr".split(" ").forEach(function(tag) {
                Object.defineProperty(components, tag, {get: function() {return handler.get(target, tag);}});
              });
              return components;
            })({}, {`,
              );
            },
          },
        ]
      : []),
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
    ...(isLegacyBuild
      ? [
          legacy({
            targets: ["ios >= 8"],
            additionalLegacyPolyfills: [
              "dom4",
              "whatwg-fetch",
              "abortcontroller-polyfill/dist/abortcontroller-polyfill-only.js",
              "css.escape",
              "@formatjs/intl-getcanonicallocales/polyfill.js",
              "@formatjs/intl-locale/polyfill.js",
              "@formatjs/intl-collator/polyfill.js",
              ...[
                "pluralrules",
                "numberformat",
                "datetimeformat",
                "listformat",
                "relativetimeformat",
              ].flatMap((name) => [
                `@formatjs/intl-${name}/polyfill.js`,
                `@formatjs/intl-${name}/locale-data/en.js`,
                `@formatjs/intl-${name}/locale-data/it.js`,
              ]),
              "@formatjs/intl-datetimeformat/add-all-tz.js",
            ],
          }),
        ]
      : []),
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
