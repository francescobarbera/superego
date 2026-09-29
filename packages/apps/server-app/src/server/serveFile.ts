import { readFile } from "node:fs/promises";
import type { ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".avif": "image/avif",
  ".jpg": "image/jpeg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

export default async function serveFile(
  response: ServerResponse,
  directory: string,
  pathname: string,
  headOnly: boolean,
): Promise<boolean> {
  const fileName = resolve(directory, `.${pathname}`);
  if (!fileName.startsWith(`${resolve(directory)}${sep}`)) {
    return false;
  }
  try {
    const content = await readFile(fileName);
    response.writeHead(200, {
      "Content-Type":
        contentTypes[extname(fileName)] ?? "application/octet-stream",
      "Content-Length": content.byteLength,
      "Cache-Control": pathname.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(headOnly ? undefined : content);
    return true;
  } catch (error) {
    if (
      ["ENOENT", "EISDIR", "ENOTDIR"].includes(
        (error as NodeJS.ErrnoException).code ?? "",
      )
    ) {
      return false;
    }
    throw error;
  }
}
