"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { establishAuthSession } from "@/lib/auth";
import { me, updateProfile } from "@/lib/api";
import { resolveAuthenticatedLandingRoute } from "@/lib/initialGoalSetup";

type GoogleGSICredentialResponse = { credential?: string };

function gsiLog(event: string, extra?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[GSI] ${event}`, { ts: Date.now(), ...extra });
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return {};
  }
}

export type UseGoogleSignInParams = {
  googleClientId: string;
  view: "login" | "signup" | "forgot" | "verify";
};

export type UseGoogleSignInReturn = {
  googleButtonRef: React.RefObject<HTMLDivElement | null>;
  googleError: string;
  setGoogleError: (error: string) => void;
};

export function useGoogleSignIn({ googleClientId, view }: UseGoogleSignInParams): UseGoogleSignInReturn {
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [googleError, setGoogleError] = useState("");

  useEffect(() => {
    // Wrap entire effect in try/catch to prevent any uncaught error from
    // Google GSI (script load, render, etc.) from breaking the entire page.
    try {
      if (!googleClientId || typeof window === "undefined") return;
      if (view !== "login" && view !== "signup") return;
      let cancelled = false;
      let waitTimeout: ReturnType<typeof setTimeout> | null = null;
      let gsiConfigured = false;

      async function handleGoogleCredential(response: GoogleGSICredentialResponse) {
        gsiLog("gsi_credential_received", { hasToken: !!(response?.credential) });
        if (watchdogTimerRef.current) {
          clearTimeout(watchdogTimerRef.current);
          watchdogTimerRef.current = null;
        }
        const idToken = typeof response?.credential === "string" ? response.credential : "";
        if (!idToken) {
          if (!cancelled) setGoogleError("Falha no login Google.");
          return;
        }
        try {
          const identity = await me(idToken);
          if (identity.user_id === idToken) {
            if (!cancelled) {
              setGoogleError("OIDC não está ativo no backend. Configure OIDC_ISSUERS e OIDC_AUDIENCES.");
            }
            gsiLog("gsi_me_error", { reason: "oidc_not_configured" });
            return;
          }
          gsiLog("gsi_me_success");
          await establishAuthSession(idToken);

          const claims = decodeJwtPayload(idToken);
          const given = typeof claims.given_name === "string" ? claims.given_name.trim() : "";
          const family = typeof claims.family_name === "string" ? claims.family_name.trim() : "";
          const fullName = typeof claims.name === "string" ? claims.name.trim() : "";
          let composedName = "";
          if (given && family) {
            composedName = `${given} ${family.split(" ").slice(-1)[0]}`;
          } else if (given) {
            composedName = given;
          } else if (fullName) {
            composedName = fullName;
          }
          if (composedName) {
            void updateProfile("", { display_name: composedName });
          }

          const targetRoute = await resolveAuthenticatedLandingRoute("");
          if (!cancelled) router.replace(targetRoute);
        } catch {
          gsiLog("gsi_me_error", { reason: "network_or_auth" });
          if (!cancelled) setGoogleError("Não foi possível autenticar com Google.");
        }
      }

      function initGoogleButton() {
        try {
          const gsi = window.google?.accounts?.id;
          const container = googleButtonRef.current;
          if (!gsi || !container) return;
          if (!gsiConfigured) {
            gsi.initialize({
              client_id: googleClientId,
              callback: handleGoogleCredential,
              auto_select: false,
            });
            gsiConfigured = true;
          }
          // Evita widgets duplicados ao alternar entre login/cadastro.
          container.innerHTML = "";
          gsi.renderButton(container, {
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "rectangular",
            locale: "pt-BR",
            width: 320,
          });
          gsiLog("gsi_button_rendered");
        } catch (err) {
          gsiConfigured = false;
          gsiLog("gsi_init_error", { error: String(err) });
          if (!cancelled) setGoogleError("Erro ao inicializar botão Google.");
        }
      }

      // Polling fallback: fires after script load in case window.google isn't
      // populated synchronously by the onload event (common on slow connections).
      const waitForGoogle = () => {
        if (cancelled) return;
        if (window.google?.accounts?.id) {
          initGoogleButton();
          return;
        }
        waitTimeout = setTimeout(waitForGoogle, 150);
      };

      // Click detection via pointerdown capture on document: the GSI button
      // renders inside an iframe so direct listeners on the container won't fire.
      const onPointerDown = (e: PointerEvent) => {
        const container = googleButtonRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          gsiLog("gsi_button_clicked");
          if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
          watchdogTimerRef.current = setTimeout(() => {
            watchdogTimerRef.current = null;
            gsiLog("gsi_no_callback_timeout");
            if (!cancelled) {
              setGoogleError("Toque novamente ou recarregue a página.");
              initGoogleButton();
            }
          }, 10_000);
        }
      };
      document.addEventListener("pointerdown", onPointerDown, true);

      // Tab-return / focus revalidation: re-render if button iframe went stale.
      const revalidateOnFocus = () => {
        if (document.visibilityState !== "visible") return;
        const container = googleButtonRef.current;
        if (!container) return;
        const iframe = container.querySelector("iframe");
        const stale = !iframe || iframe.getBoundingClientRect().width === 0;
        if (stale) {
          gsiLog("gsi_button_stale_on_focus");
          if (window.google?.accounts?.id) initGoogleButton();
          else waitForGoogle();
        }
      };
      document.addEventListener("visibilitychange", revalidateOnFocus);
      window.addEventListener("focus", revalidateOnFocus);

      const cleanup = () => {
        cancelled = true;
        gsiConfigured = false;
        if (waitTimeout) clearTimeout(waitTimeout);
        document.removeEventListener("pointerdown", onPointerDown, true);
        document.removeEventListener("visibilitychange", revalidateOnFocus);
        window.removeEventListener("focus", revalidateOnFocus);
      };

      if (window.google?.accounts?.id) {
        initGoogleButton();
        return cleanup;
      }

      const existingScript = document.querySelector(
        "script[data-krosmed-google-gsi='true']",
      ) as HTMLScriptElement | null;

      if (existingScript) {
        existingScript.addEventListener("load", () => { if (!cancelled) initGoogleButton(); });
        waitForGoogle();
        return cleanup;
      }

      gsiLog("gsi_script_load_start");
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.krosmedGoogleGsi = "true";
      script.onload = () => {
        gsiLog("gsi_script_loaded");
        if (!cancelled) initGoogleButton();
      };
      script.onerror = () => {
        gsiLog("gsi_script_error");
        if (!cancelled) setGoogleError("Não foi possível carregar o login Google.");
      };
      document.head.appendChild(script);
      waitForGoogle();

      return () => {
        script.onload = null;
        cleanup();
      };
    } catch (err) {
      gsiLog("gsi_effect_error", { error: String(err) });
      if (typeof setGoogleError === "function") {
        window.setTimeout(() => {
          setGoogleError("Erro ao carregar login Google. Recarregue a página.");
        }, 0);
      }
    }
  }, [googleClientId, router, view]);

  return { googleButtonRef, googleError, setGoogleError };
}
