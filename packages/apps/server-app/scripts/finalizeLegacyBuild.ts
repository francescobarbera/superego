import { createHash } from "node:crypto";
import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { transformAsync } from "@babel/core";
import presetEnv from "@babel/preset-env";

// Vite 8 emits its polyfill/SystemJS bootstrap with ES2015 bundler helpers,
// even when the application chunks target older Safari. Lower that bootstrap
// too, then update its content hash and both HTML entry points.
const directory = resolve(
  process.argv[2] ?? resolve(import.meta.dirname, "../dist/browser-legacy"),
);
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
  presets: [
    [
      presetEnv,
      { targets: { ios: "8" }, modules: false, forceAllTransforms: true },
    ],
  ],
  sourceType: "script",
  configFile: false,
  babelrc: false,
  compact: true,
  comments: false,
});
if (!result?.code) {
  throw new Error("Failed to compile the legacy polyfill bootstrap");
}
// Safari 9 has non-configurable function length/name properties. These
// FormatJS Collator assignments only adjust reflective metadata; sorting and
// locale matching do not depend on them.
const compiledCode = result.code
  .replaceAll(
    /Object\.defineProperty\(([$\w]*boundCompare),"name",\{value:""\}\)/g,
    "void 0",
  )
  .replaceAll(
    /Object\.defineProperty\(([$\w]+)\.supportedLocalesOf,"length",\{value:1\}\)/g,
    "void 0",
  )
  .replaceAll(
    /Object\.defineProperty\(Object\.getOwnPropertyDescriptor\(([$\w]+)\.prototype,"compare"\)\.get,"name",\{value:"get compare"\}\)/g,
    "void 0",
  );
const hash = createHash("sha256")
  .update(compiledCode)
  .digest("hex")
  .slice(0, 12);
const compiledFileName = `polyfills-legacy-${hash}.js`;
await writeFile(filePath, compiledCode);
if (fileName !== compiledFileName) {
  await rename(filePath, resolve(assetsDirectory, compiledFileName));
}
for (const entry of ["index.html", "app-sandbox.html"]) {
  const entryPath = resolve(directory, entry);
  const html = await readFile(entryPath, "utf8");
  await writeFile(
    entryPath,
    html.replaceAll(fileName, compiledFileName).replaceAll(
      /System\.import\(document\.getElementById\('vite-legacy-entry'\)\.getAttribute\('data-src'\)\)(?!\.catch)/g,
      `System.import(document.getElementById('vite-legacy-entry').getAttribute('data-src')).catch(function(error) {
        var message = document.createElement('pre');
        message.setAttribute('role', 'alert');
        message.style.cssText = 'white-space:pre-wrap;padding:20px;color:#111;background:#fff';
        message.textContent = 'Superego could not start.\\n' + (error.message || error);
        document.body.appendChild(message);
      })`,
    ),
  );
}
