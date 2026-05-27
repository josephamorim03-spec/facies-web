"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "./auth";

export function useAuthToken(): { token: string; tokenResolved: boolean } {
  const [token, setToken] = useState("");
  const [tokenResolved, setTokenResolved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => {
      setToken(getAuthToken());
      setTokenResolved(true);
    };
    sync();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return { token, tokenResolved };
}
