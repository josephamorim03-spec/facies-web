"use client";

import { useEffect } from "react";

let _deferredPrompt: any = null;

export function getDeferredInstallPrompt(): any {
  return _deferredPrompt;
}

export function clearDeferredInstallPrompt(): void {
  _deferredPrompt = null;
}

export default function PwaRegister() {
  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      _deferredPrompt = e;
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV !== "production") {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            void registration.unregister();
          });
        }).catch(() => {
          // ignore cleanup failures in dev
        });
      } else {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // ignore registration failures in unsupported/prod edge scenarios
        });
      }
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  return null;
}
