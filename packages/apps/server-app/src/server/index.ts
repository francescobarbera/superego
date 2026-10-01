import { access } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { networkInterfaces } from "node:os";
import { join } from "node:path";
import getConfig from "./config.js";
import createBackend from "./createBackend.js";
import createRequestHandler from "./createRequestHandler.js";

const config = getConfig();
await access(join(config.browserDirectory, "index.html"));
const backend = await createBackend(config.databaseFile);
const frontendServer = createServer(
  createRequestHandler(backend, config, false),
);
const sandboxServer = createServer(createRequestHandler(backend, config, true));

async function listen(server: Server, port: number) {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, config.host, () => {
      server.removeListener("error", reject);
      resolve();
    });
  });
}

try {
  await listen(sandboxServer, config.sandboxPort);
  await listen(frontendServer, config.port);
} catch (error) {
  frontendServer.close();
  sandboxServer.close();
  throw error;
}

console.log(`Database: ${config.databaseFile}`);
console.log(`Superego: http://localhost:${config.port}`);
if (config.host === "0.0.0.0") {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        console.log(`LAN: http://${address.address}:${config.port}`);
      }
    }
  }
}
console.log(`App sandbox port: ${config.sandboxPort}`);

function shutdown() {
  console.log(
    "Stopping Superego; waiting for active requests and background work",
  );
  frontendServer.close();
  sandboxServer.close();
  setTimeout(() => process.exit(0), 30_000).unref();
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
