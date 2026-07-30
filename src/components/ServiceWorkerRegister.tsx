"use client";

import { useEffect } from "react";

// The service worker is a production-only concern.
//
// In development it actively breaks things: Next serves dev chunks under stable
// filenames (`/_next/static/chunks/app/page.js`) rather than content-hashed
// ones, so the cache-first rule in sw.js pins the app to whatever build was
// cached first — edits stop appearing and no amount of reloading helps. It also
// accumulates every HMR `hot-update.js` file forever.
//
// So: register only in production, and in development tear down any worker and
// cache left behind by a previous run, otherwise a stale worker keeps serving a
// frozen app long after this code changed.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Clear the worker *and* its caches independently: a cache can outlive
      // its registration, and a stale cache alone is enough to keep serving
      // frozen chunks.
      const cleanup = async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        let removedCaches = 0;
        if ("caches" in window) {
          const names = (await caches.keys()).filter((name) => name.startsWith("pantry-"));
          await Promise.all(names.map((name) => caches.delete(name)));
          removedCaches = names.length;
        }

        if (registrations.length > 0 || removedCaches > 0) {
          console.info(
            `[dev] Removed ${registrations.length} service worker(s) and ${removedCaches} cache(s). Reload for fresh assets.`
          );
        }
      };

      cleanup().catch(() => {
        // Nothing actionable — dev just carries on without offline support.
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal — app still works without offline support.
    });
  }, []);

  return null;
}
