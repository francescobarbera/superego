import { createHash } from "node:crypto";
import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { transformAsync } from "@babel/core";
import presetEnv from "@babel/preset-env";

// Vite 8 emits its polyfill/SystemJS bootstrap with ES2015 bundler helpers,
// even when the application chunks target older Safari. Lower that bootstrap
// too, then update its content hash and both HTML entry points.
const directory = resolve(import.meta.dirname, "../dist/browser-legacy");
const assetsDirectory = resolve(directory, "assets");
const bootstrapFiles = (await readdir(assetsDirectory)).filter((fileName) =>
  /^polyfills-legacy-.*\.js$/.test(fileName),
);
if (bootstrapFiles.length !== 1) {
  throw new Error("Expected one legacy polyfill bootstrap");
}
const fileName = bootstrapFiles[0]!;
const filePath = resolve(assetsDirectory, fileName);
const result = await transformAsync(await readFile(filePath, "utf8"), {
  presets: [[presetEnv, { targets: { ios: "8" }, modules: false }]],
  sourceType: "script",
  configFile: false,
  babelrc: false,
  compact: true,
  comments: false,
});
if (!result?.code) {
  throw new Error("Failed to compile the legacy polyfill bootstrap");
}
const hash = createHash("sha256")
  .update(result.code)
  .digest("hex")
  .slice(0, 12);
const compiledFileName = `polyfills-legacy-${hash}.js`;
await writeFile(filePath, result.code);
if (fileName !== compiledFileName) {
  await rename(filePath, resolve(assetsDirectory, compiledFileName));
}
for (const entry of ["index.html", "app-sandbox.html"]) {
  const entryPath = resolve(directory, entry);
  const html = await readFile(entryPath, "utf8");
  await writeFile(entryPath, html.replaceAll(fileName, compiledFileName));
}
