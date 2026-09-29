import "./polyfills.js";
import { renderBrowserApp } from "@superego/browser-app";
import { QueryClient } from "@tanstack/react-query";
import BackendHttpProxyClient from "./BackendHttpProxyClient.js";

renderBrowserApp(
  new BackendHttpProxyClient(),
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: true },
      mutations: { retry: false },
    },
  }),
);
