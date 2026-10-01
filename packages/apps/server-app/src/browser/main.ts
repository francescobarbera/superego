import "./polyfills.js";
import { renderBrowserApp } from "@superego/browser-app";
import { QueryClient } from "@tanstack/react-query";
import BackendHttpProxyClient from "./BackendHttpProxyClient.js";
import "./legacyLayout.css";

renderBrowserApp(
  new BackendHttpProxyClient(),
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: true,
        // Property tracking requires native Proxy, unavailable on iOS 9.
        notifyOnChangeProps: typeof Proxy === "undefined" ? "all" : undefined,
      },
      mutations: { retry: false },
    },
  }),
);
document.getElementById("superego-loading")?.remove();
