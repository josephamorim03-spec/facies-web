"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: string | HTMLElement,
        parameters: Record<string, unknown>,
      ) => number;
      reset: (widgetId?: number) => void;
    };
  }
}

type RecaptchaCheckboxProps = {
  siteKey: string;
  onTokenChange: (token: string) => void;
  resetCounter?: number;
};

export default function RecaptchaCheckbox({
  siteKey,
  onTokenChange,
  resetCounter = 0,
}: RecaptchaCheckboxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!siteKey || typeof window === "undefined") return;

    let cancelled = false;
    let waitTimeout: ReturnType<typeof setTimeout> | null = null;
    const scriptSelector = "script[data-krosmed-recaptcha='true']";

    const renderWidget = () => {
      if (cancelled) return;
      const grecaptcha = window.grecaptcha;
      if (!grecaptcha || !containerRef.current || widgetIdRef.current !== null) return;
      widgetIdRef.current = grecaptcha.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onTokenChange(token || ""),
        "expired-callback": () => onTokenChange(""),
        "error-callback": () => onTokenChange(""),
      });
    };

    const waitForGrecaptcha = () => {
      if (cancelled) return;
      if (window.grecaptcha?.render) {
        renderWidget();
        return;
      }
      waitTimeout = setTimeout(waitForGrecaptcha, 120);
    };

    if (window.grecaptcha?.render) {
      renderWidget();
      return () => {
        cancelled = true;
        if (waitTimeout) clearTimeout(waitTimeout);
      };
    }

    const existingScript = document.querySelector(scriptSelector) as HTMLScriptElement | null;
    const handleLoad = () => renderWidget();

    if (existingScript) {
      if (existingScript.dataset.krosmedRecaptchaLoaded === "true") {
        waitForGrecaptcha();
        return () => {
          cancelled = true;
          if (waitTimeout) clearTimeout(waitTimeout);
        };
      }
      existingScript.addEventListener("load", handleLoad);
      waitForGrecaptcha();
      return () => {
        cancelled = true;
        if (waitTimeout) clearTimeout(waitTimeout);
        existingScript.removeEventListener("load", handleLoad);
      };
    }

    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.jsórender=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.krosmedRecaptcha = "true";
    script.dataset.krosmedRecaptchaLoaded = "false";
    script.onload = () => {
      script.dataset.krosmedRecaptchaLoaded = "true";
      handleLoad();
    };
    document.head.appendChild(script);
    waitForGrecaptcha();

    return () => {
      cancelled = true;
      if (waitTimeout) clearTimeout(waitTimeout);
      script.onload = null;
    };
  }, [onTokenChange, siteKey]);

  useEffect(() => {
    const grecaptcha = window.grecaptcha;
    if (!grecaptcha || widgetIdRef.current === null) return;
    grecaptcha.reset(widgetIdRef.current);
    onTokenChange("");
  }, [onTokenChange, resetCounter]);

  return <div ref={containerRef} className="flex justify-center" />;
}
