"use client";

import { useEffect } from "react";

// @serwist/next only builds public/sw.js — unlike next-pwa, it does not
// inject a registration script into the page, so the app must register it
// itself.
//
// This must NOT register in dev. `disable: NODE_ENV === "development"` in
// next.config.ts only stops the *build* from regenerating public/sw.js —
// it does nothing about a copy already sitting on disk from an earlier
// `npm run build`, which `next dev` happily serves as a plain static file
// from public/. If this component ever registered unconditionally, dev
// mode would pick that stale worker back up and its NetworkFirst page
// cache (see src/app/sw.ts) can serve an old cached snapshot of a route on
// a slow/interrupted dev-server response — including, concretely, an
// entire page rendered from before a feature existed, causing a real
// server/client hydration mismatch that has nothing to do with the
// route's own code. (This is exactly what happened to
// /coordinator/students after this repo's `npm run build` had run
// several times during earlier feature work.)
//
// So: only ever register in production, and in every OTHER environment,
// actively unregister anything already installed and clear any caches —
// self-healing for anyone who already has a stale worker registered from
// a previous prod-build test on this same origin, not just a guard
// against registering a new one.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) registration.unregister();
      });
      if ("caches" in window) {
        caches.keys().then((names) => {
          for (const name of names) caches.delete(name);
        });
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Nothing to register (e.g. sw.js failed to build) — fine.
    });
  }, []);

  return null;
}
