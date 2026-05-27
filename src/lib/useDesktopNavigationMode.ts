"use client";

import { useEffect, useState } from "react";

const DESKTOP_NAV_QUERY = "(min-width: 768px) and (hover: hover) and (pointer: fine)";
const WIDE_VIEWPORT_QUERY = "(min-width: 1024px)";

function detectDesktopNavigationMode(): boolean {
  if (typeof window === "undefined") return false;
  const isWideViewport = window.matchMedia(WIDE_VIEWPORT_QUERY).matches;
  const supportsDesktopPointer = window.matchMedia(DESKTOP_NAV_QUERY).matches;
  const hasTouchInput = (navigator.maxTouchPoints ?? 0) > 0;
  return isWideViewport || (supportsDesktopPointer && !hasTouchInput);
}

export function useDesktopNavigationMode(): boolean {
  const [isDesktopNavigation, setIsDesktopNavigation] = useState(false);

  useEffect(() => {
    const desktopMediaQuery = window.matchMedia(DESKTOP_NAV_QUERY);
    const wideViewportQuery = window.matchMedia(WIDE_VIEWPORT_QUERY);
    const update = () => setIsDesktopNavigation(detectDesktopNavigationMode());
    update();

    if (typeof desktopMediaQuery.addEventListener === "function") {
      desktopMediaQuery.addEventListener("change", update);
      wideViewportQuery.addEventListener("change", update);
    } else {
      desktopMediaQuery.addListener(update);
      wideViewportQuery.addListener(update);
    }
    window.addEventListener("resize", update);

    return () => {
      if (typeof desktopMediaQuery.removeEventListener === "function") {
        desktopMediaQuery.removeEventListener("change", update);
        wideViewportQuery.removeEventListener("change", update);
      } else {
        desktopMediaQuery.removeListener(update);
        wideViewportQuery.removeListener(update);
      }
      window.removeEventListener("resize", update);
    };
  }, []);

  return isDesktopNavigation;
}
