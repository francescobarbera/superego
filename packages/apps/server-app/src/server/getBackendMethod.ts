import type { Backend } from "@superego/backend";

export default function getBackendMethod(backend: Backend, channel: string) {
  const [domainName, methodName, extra] = channel.split(".");
  // Export gets a dedicated download endpoint, never a client-selected path
  // on the server's filesystem.
  if (
    !domainName ||
    !methodName ||
    extra !== undefined ||
    domainName === "database"
  ) {
    return null;
  }
  const domains: (keyof Backend)[] = [
    "collectionCategories",
    "collections",
    "documents",
    "files",
    "assistants",
    "inference",
    "apps",
    "packs",
    "boutique",
    "backgroundJobs",
    "globalSettings",
  ];
  if (!domains.includes(domainName as keyof Backend)) {
    return null;
  }
  const domain = backend[domainName as keyof Backend];
  if (!Object.hasOwn(domain, methodName)) {
    return null;
  }
  const method = (domain as Record<string, unknown>)[methodName];
  return typeof method === "function" ? method.bind(domain) : null;
}
