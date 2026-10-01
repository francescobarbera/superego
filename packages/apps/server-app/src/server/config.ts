import { homedir } from "node:os";
import { join, resolve } from "node:path";

function readPort(name: string, fallback: number): number {
  const value = process.env[name];
  const port = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a port between 1 and 65535`);
  }
  return port;
}

export default function getConfig() {
  const port = readPort("SUPEREGO_PORT", 5177);
  const sandboxPort = readPort("SUPEREGO_SANDBOX_PORT", 5178);
  if (port === sandboxPort) {
    throw new Error("The frontend and app sandbox must use different ports");
  }
  return {
    host: process.env["SUPEREGO_HOST"] ?? "0.0.0.0",
    port,
    sandboxPort,
    databaseFile: resolve(
      process.env["SUPEREGO_DATABASE_FILE"] ??
        join(
          process.env["XDG_CONFIG_HOME"] ?? join(homedir(), ".config"),
          "superego",
          "superego.db",
        ),
    ),
    browserDirectory: process.env["SUPEREGO_BROWSER_DIRECTORY"]
      ? resolve(process.env["SUPEREGO_BROWSER_DIRECTORY"])
      : resolve(import.meta.dirname, "../browser"),
  };
}
