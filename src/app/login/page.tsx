"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { clearAuthToken } from "@/lib/auth";
import { resolveAuthenticatedLandingRoute } from "@/lib/initialGoalSetup";
import { useGoogleSignIn } from "./_hooks/useGoogleSignIn";
import { useInstallPrompt } from "./_hooks/useInstallPrompt";
import { GoogleSection } from "./_components/GoogleSection";
import { InstallBanner } from "./_components/InstallBanner";

export default function LoginPage() {
  const router = useRouter();
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

  const { googleButtonRef, googleError, setGoogleError } = useGoogleSignIn({
    googleClientId,
    view: "login",
  });
  const { installState, showIosTooltip, setShowIosTooltip, handleInstall } =
    useInstallPrompt();

  useEffect(() => {
    let active = true;

    fetch("/api/profile", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then((res) => {
        if (!active || !res.ok) return;
        resolveAuthenticatedLandingRoute("")
          .then((targetRoute) => {
            if (active) router.replace(targetRoute);
          })
          .catch(() => {
            if (active) clearAuthToken();
          });
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="bg-paper min-h-screen w-full flex items-center justify-center px-4 py-6">
      <div className={`w-full max-w-md space-y-6${installState !== "hidden" ? " pb-20" : ""}`}>
        <div className="text-center space-y-2">
          <Image
            src="/icon-192.png"
            alt="KrosMed"
            width={56}
            height={56}
            className="mx-auto rounded-xl"
            priority
          />
          <h1 className="text-2xl font-serif text-ink">KrosMed</h1>
          <p className="text-sm text-muted">Entre com sua conta Google</p>
        </div>

        <GoogleSection
          googleClientId={googleClientId}
          googleButtonRef={googleButtonRef}
          googleError={googleError}
          onGoogleError={setGoogleError}
        />
      </div>

      <InstallBanner
        installState={installState}
        showIosTooltip={showIosTooltip}
        onInstall={handleInstall}
        onCloseTooltip={() => setShowIosTooltip(false)}
      />
    </div>
  );
}
