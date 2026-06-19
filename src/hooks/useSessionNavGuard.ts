"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isReviewSessionActive } from "@/lib/studyImportRuntime";
import { clearAuthToken } from "@/lib/auth";

type NavigationEventLike = {
  preventDefault: () => void;
};

export function useSessionNavGuard({
  pathname,
  onCloseDrawer,
}: {
  pathname: string;
  onCloseDrawer?: () => void;
}) {
  const router = useRouter();
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [pendingNavHref, setPendingNavHref] = useState<string | null>(null);

  function guardNavigation(resolvedHref: string, event?: NavigationEventLike): boolean {
    if (pathname === resolvedHref) {
      event?.preventDefault();
      setExitConfirmOpen(false);
      setPendingNavHref(null);
      onCloseDrawer?.();
      return false;
    }
    if (isReviewSessionActive()) {
      event?.preventDefault();
      setPendingNavHref(resolvedHref);
      setExitConfirmOpen(true);
      return false;
    }
    setExitConfirmOpen(false);
    setPendingNavHref(null);
    onCloseDrawer?.();
    return true;
  }

  function handleNavClick(event: NavigationEventLike, resolvedHref: string) {
    guardNavigation(resolvedHref, event);
  }

  function cancelExit() {
    setExitConfirmOpen(false);
    setPendingNavHref(null);
  }

  function confirmExit() {
    if (!pendingNavHref) { cancelExit(); return; }
    const href = pendingNavHref;
    setExitConfirmOpen(false);
    setPendingNavHref(null);
    onCloseDrawer?.();
    router.push(href);
  }

  function requestLogout() {
    setLogoutConfirmOpen(true);
  }

  function cancelLogout() {
    setLogoutConfirmOpen(false);
  }

  function confirmLogout() {
    clearAuthToken();
    setLogoutConfirmOpen(false);
    onCloseDrawer?.();
    router.replace("/login");
  }

  return {
    exitConfirmOpen,
    logoutConfirmOpen,
    guardNavigation,
    handleNavClick,
    cancelExit,
    confirmExit,
    requestLogout,
    cancelLogout,
    confirmLogout,
  };
}
