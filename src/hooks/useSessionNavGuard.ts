"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { isReviewSessionActive } from "@/lib/studyImportRuntime";
import { clearAuthToken } from "@/lib/auth";

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

  function handleNavClick(e: MouseEvent, resolvedHref: string) {
    e.preventDefault();
    if (pathname === resolvedHref) {
      setExitConfirmOpen(false);
      setPendingNavHref(null);
      onCloseDrawer?.();
      return;
    }
    if (isReviewSessionActive()) {
      setPendingNavHref(resolvedHref);
      setExitConfirmOpen(true);
      return;
    }
    setExitConfirmOpen(false);
    setPendingNavHref(null);
    onCloseDrawer?.();
    router.replace(resolvedHref);
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
    router.replace(href);
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
    handleNavClick,
    cancelExit,
    confirmExit,
    requestLogout,
    cancelLogout,
    confirmLogout,
  };
}
