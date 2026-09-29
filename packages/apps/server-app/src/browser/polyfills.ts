import "core-js/stable";
import "whatwg-fetch";
import "urlpattern-polyfill";
import { ResizeObserver as ResizeObserverPolyfill } from "@juggle/resize-observer";

if (!window.ResizeObserver) {
  window.ResizeObserver = ResizeObserverPolyfill;
}

if (!window.matchMedia("all").addEventListener) {
  const matchMedia = window.matchMedia.bind(window);
  window.matchMedia = (query) => {
    const mediaQuery = matchMedia(query);
    const listeners = new Map<
      EventListenerOrEventListenerObject,
      (event: MediaQueryListEvent) => void
    >();
    mediaQuery.addEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject | null,
    ) => {
      if (type !== "change" || !listener || listeners.has(listener)) {
        return;
      }
      const callback = (event: MediaQueryListEvent) => {
        if (typeof listener === "function") {
          listener.call(mediaQuery, event);
        } else {
          listener.handleEvent(event);
        }
      };
      listeners.set(listener, callback);
      mediaQuery.addListener(callback);
    };
    mediaQuery.removeEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject | null,
    ) => {
      const callback = listener && listeners.get(listener);
      if (type === "change" && listener && callback) {
        mediaQuery.removeListener(callback);
        listeners.delete(listener);
      }
    };
    return mediaQuery;
  };
}

// randomUUID is restricted to secure contexts, even in otherwise modern
// browsers. getRandomValues also works on a plain HTTP LAN connection.
if (!crypto.randomUUID) {
  crypto.randomUUID = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hexadecimal = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    return `${hexadecimal.slice(0, 8)}-${hexadecimal.slice(8, 12)}-${hexadecimal.slice(12, 16)}-${hexadecimal.slice(16, 20)}-${hexadecimal.slice(20)}`;
  };
}
