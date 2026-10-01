import type { Backend } from "@superego/backend";
import { expect, it } from "vitest";
import getBackendMethod from "./getBackendMethod.js";

it("keeps the domain receiver when dispatching a backend method", () => {
  // Setup SUT
  const collections = {
    list() {
      return this;
    },
  };
  const backend = { collections } as unknown as Backend;

  // Exercise
  const method = getBackendMethod(backend, "collections.list");

  // Verify
  expect(method!()).toBe(collections);
});

it.each([
  "collections.constructor",
  "collections.toString",
  "collections.__proto__",
  "constructor.constructor",
  "database.export",
  "collections.list.extra",
  "collections",
  "collections.missing",
  "privateMethod.call",
])("does not expose %s", (channel) => {
  // Setup SUT
  const backend = { collections: { list() {} } } as unknown as Backend;

  // Exercise
  const method = getBackendMethod(backend, channel);

  // Verify
  expect(method).toBeNull();
});
