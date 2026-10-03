import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, Serwist } from "serwist";
import { defaultCache } from "@serwist/next/worker";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // `defaultCache` covers static assets, fonts, and the RSC payload
    // fetches used by client-side navigation — but not the full HTML
    // document response for a hard navigation (page reload / freshly
    // opened tab). Without this entry, a page that has genuinely been
    // visited before still fails to reload with no network, because the
    // document itself was never cached anywhere. NetworkFirst keeps every
    // visit showing live data while online, and falls back to the last
    // successful response once the network request stalls or fails.
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "pages",
        networkTimeoutSeconds: 3,
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
