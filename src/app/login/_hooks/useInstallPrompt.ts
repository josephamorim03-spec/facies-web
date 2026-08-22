"use client";

import { useEffect, useState } from "react";
import { clearDeferredInstallPrompt, getDeferredInstallPrompt } from "@/components/PwaRegister";

type InstallState = "android" | "ios" | "ios_chrome" | "hidden";

function isStandaloneDisplayMode(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

function isIosDevice(): boolean {
  const ua = navigator.userAgent;
  const iOSByUA = /iPad|iPhone|iPod/.test(ua);
  const iPadDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOSByUA || iPadDesktopMode;
}

function isIosChrome(): boolean {
  return /CriOS/i.test(navigator.userAgent);
}

export type UseInstallPromptReturn = {
  installState: InstallState;
  showIosTooltip: boolean;
  setShowIosTooltip: (v: boolean) => void;
  handleInstall: () => Promise<void>;
};

export function useInstallPrompt(): UseInstallPromptReturn {
  const [installState, setInstallState] = useState<InstallState>("hidden");
  const [showIosTooltip, setShowIosTooltip] = useState(false);

  useEffect(() => {
    const refreshInstallState = () => {
      if (isStandaloneDisplayMode()) {
        setInstallState("hidden");
        return;
      }
      const hasDeferredPrompt = Boolean(getDeferredInstallPrompt());
      if (hasDeferredPrompt) {
        setInstallState("android");
        return;
      }
      if (isIosDevice()) {
        setInstallState(isIosChrome() ? "ios_chrome" : "ios");
        return;
      }
      setInstallState("hidden");
    };

    const onBeforeInstallPrompt = () => {
      if (!isStandaloneDisplayMode()) {
        setInstallState("android");
      }
    };
    const onAppInstalled = () => {
      setInstallState("hidden");
      setShowIosTooltip(false);
    };

    refreshInstallState();
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  type DeferredInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice?: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  };

  async function handleInstall() {
    if (installState === "ios_chrome") {
      setShowIosTooltip(true);
      return;
    }
    if (installState === "ios") {
      setShowIosTooltip(false);
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ url: window.location.href, title: "Fácies" });
        } catch {
          // If share fails/cancels, keep explicit fallback guidance visible.
          setShowIosTooltip(true);
        }
        return;
      }
      setShowIosTooltip(true);
      return;
    }
    const prompt = getDeferredInstallPrompt() as DeferredInstallPromptEvent | null;
    if (!prompt) {
      setInstallState("hidden");
      return;
    }
    await prompt.prompt();
    try {
      await prompt.userChoice;
    } catch {
      // no-op
    }
    clearDeferredInstallPrompt();
    setInstallState("hidden");
  }

  return { installState, showIosTooltip, setShowIosTooltip, handleInstall };
}
