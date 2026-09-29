import { mkdtemp, readFile, rm } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Backend } from "@superego/backend";
import { parse, stringify } from "devalue";
import type getConfig from "./config.js";
import getBackendMethod from "./getBackendMethod.js";
import serveFile from "./serveFile.js";

const maximumRequestBytes = 64 * 1024 * 1024;

export default function createRequestHandler(
  backend: Backend,
  config: ReturnType<typeof getConfig>,
  sandbox: boolean,
) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    try {
      const origin = new URL(`http://${request.headers.host}`);
      const url = new URL(request.url ?? "/", origin);
      const pathname = decodeURIComponent(url.pathname);
      if (!sandbox && pathname.startsWith("/api/")) {
        if (
          request.headers.origin &&
          request.headers.origin !== origin.origin
        ) {
          response
            .writeHead(403)
            .end("Cross-origin API requests are not allowed");
          return;
        }
        if (pathname === "/api/health" && request.method === "GET") {
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ status: "ok" }));
          return;
        }
        if (pathname === "/api/database/export" && request.method === "GET") {
          const directory = await mkdtemp(join(tmpdir(), "superego-export-"));
          try {
            const fileName = join(directory, "superego.db");
            const result = await backend.database.export(fileName);
            if (!result.success) {
              response.writeHead(500).end("Database export failed");
              return;
            }
            const content = await readFile(fileName);
            response
              .writeHead(200, {
                "Content-Type": "application/vnd.sqlite3",
                "Content-Disposition": 'attachment; filename="superego.db"',
                "Content-Length": content.byteLength,
              })
              .end(content);
          } finally {
            await rm(directory, { recursive: true, force: true });
          }
          return;
        }
        if (
          request.method !== "POST" ||
          !pathname.startsWith("/api/backend/")
        ) {
          response.writeHead(404).end("Not found");
          return;
        }
        if (request.headers["content-type"] !== "application/json") {
          response.writeHead(415).end("Expected application/json");
          return;
        }
        const method = getBackendMethod(
          backend,
          pathname.slice("/api/backend/".length),
        );
        if (!method) {
          response.writeHead(404).end("Unknown backend method");
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of request) {
          size += chunk.length;
          if (size > maximumRequestBytes) {
            response.writeHead(413).end("Request exceeds 64 MiB");
            return;
          }
          chunks.push(chunk);
        }
        let args: unknown;
        try {
          args = parse(Buffer.concat(chunks).toString("utf8"));
        } catch {
          response.writeHead(400).end("Invalid request body");
          return;
        }
        if (!Array.isArray(args)) {
          response.writeHead(400).end("Expected an array of arguments");
          return;
        }
        const result = await method(...args);
        response.setHeader("Content-Type", "application/json");
        response.end(stringify(result));
        return;
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { Allow: "GET, HEAD" }).end();
        return;
      }
      if (!sandbox && pathname === "/config.js") {
        const sandboxUrl = new URL("/app-sandbox.html", origin);
        sandboxUrl.port = String(config.sandboxPort);
        response.setHeader("Content-Type", "text/javascript; charset=utf-8");
        response.end(
          `window.superegoConfig=${JSON.stringify({ sandboxUrl: sandboxUrl.href })};`,
        );
        return;
      }
      // Sandboxed apps have a distinct origin and cannot load the main UI or
      // access the backend directly. Their existing message bridge still works.
      const allowed = sandbox
        ? pathname === "/app-sandbox.html" || pathname.startsWith("/assets/")
        : pathname !== "/app-sandbox.html";
      if (
        allowed &&
        (await serveFile(
          response,
          config.browserDirectory,
          pathname,
          request.method === "HEAD",
        ))
      ) {
        return;
      }
      if (
        !sandbox &&
        allowed &&
        request.headers.accept?.includes("text/html")
      ) {
        if (
          await serveFile(
            response,
            config.browserDirectory,
            "/index.html",
            request.method === "HEAD",
          )
        ) {
          return;
        }
      }
      response.writeHead(404).end("Not found");
    } catch (error) {
      console.error("HTTP request failed", error);
      if (!response.headersSent) {
        response.writeHead(500).end("Internal server error");
      } else {
        response.destroy();
      }
    }
  };
}
