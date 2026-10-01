import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("crypto", {
    getRandomValues: (bytes: Uint8Array) => bytes.fill(255),
  });
  vi.stubGlobal("window", {
    matchMedia: (media: string) => ({
      media,
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("sets UUID version and variant bits when randomUUID is unavailable", async () => {
  // Exercise
  await import("./polyfills.js");
  const uuid = crypto.randomUUID();

  // Verify
  expect(uuid).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
});

it("adapts and removes media query listeners without registering duplicates", async () => {
  // Setup SUT
  await import("./polyfills.js");
  const mediaQuery = window.matchMedia("(max-width: 600px)");
  const listener = { handleEvent: vi.fn() };
  const event = { matches: true } as MediaQueryListEvent;

  // Exercise
  mediaQuery.addEventListener("change", listener);
  mediaQuery.addEventListener("change", listener);
  const callback = vi.mocked(mediaQuery.addListener).mock.calls[0]![0]!;
  callback.call(mediaQuery, event);
  mediaQuery.removeEventListener("change", listener);

  // Verify
  expect(mediaQuery.addListener).toHaveBeenCalledTimes(1);
  expect(listener.handleEvent).toHaveBeenCalledWith(event);
  expect(mediaQuery.removeListener).toHaveBeenCalledWith(callback);
});

it("preserves native browser implementations", async () => {
  // Setup SUT
  const randomUUID = vi.fn(() => "native-uuid");
  const matchMedia = vi.fn(() => ({ addEventListener: vi.fn() }));
  const resizeObserver = vi.fn();
  const escape = vi.fn();
  vi.stubGlobal("crypto", { randomUUID });
  vi.stubGlobal("window", {
    matchMedia,
    ResizeObserver: resizeObserver,
    CSS: { escape },
  });

  // Exercise
  await import("./polyfills.js");

  // Verify
  expect(crypto.randomUUID).toBe(randomUUID);
  expect(window.matchMedia).toBe(matchMedia);
  expect(window.ResizeObserver).toBe(resizeObserver);
  expect(window.CSS.escape).toBe(escape);
});

it("installs CSS escaping on the browser global when the module only exports it", async () => {
  // Exercise
  await import("./polyfills.js");

  // Verify
  expect(window.CSS.escape("a b")).toBe("a\\ b");
});
