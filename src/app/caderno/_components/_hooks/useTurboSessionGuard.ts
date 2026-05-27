"use client";

import { useEffect, useRef, useState } from "react";

export type UseTurboSessionGuardParams = {
  sessionStarted: boolean;
  sessionDone: boolean;
  onCloseAction: () => void;
};

export type UseTurboSessionGuardReturn = {
  confirmClose: boolean;
  setConfirmClose: (v: boolean) => void;
  handleCloseClick: () => void;
  confirmCloseSession: () => void;
};

export function useTurboSessionGuard(params: UseTurboSessionGuardParams): UseTurboSessionGuardReturn {
  const { sessionStarted, sessionDone, onCloseAction } = params;

  const [confirmClose, setConfirmClose] = useState(false);
  const allowExitRef = useRef(false);
  const sessionDoneRef = useRef(sessionDone);
  useEffect(() => { sessionDoneRef.current = sessionDone; }, [sessionDone]);

  // ── Popstate guard
  useEffect(() => {
    if (!sessionStarted) return;
    allowExitRef.current = false;
    const guardState = { turboRuntimeGuard: Date.now() };
    window.history.pushState(guardState, "", window.location.href);

    function onPopState() {
      if (allowExitRef.current || sessionDoneRef.current) return;
      setConfirmClose(true);
      window.history.pushState(guardState, "", window.location.href);
    }

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [sessionStarted]);

  // ── Beforeunload guard
  useEffect(() => {
    if (!sessionStarted) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (allowExitRef.current || sessionDoneRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [sessionStarted]);

  function handleCloseClick() {
    if (!sessionStarted || sessionDone) {
      allowExitRef.current = true;
      onCloseAction();
      return;
    }
    setConfirmClose(true);
  }

  function confirmCloseSession() {
    allowExitRef.current = true;
    setConfirmClose(false);
    onCloseAction();
  }

  return {
    confirmClose,
    setConfirmClose,
    handleCloseClick,
    confirmCloseSession,
  };
}
