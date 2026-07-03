"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resolveAuthenticatedLandingRoute } from "@/lib/initialGoalSetup";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    // The session cookie (krosmed_session) is httpOnly — invisible to document.cookie.
    // We must make a lightweight API call that the Next.js proxy will forward
    // with the httpOnly cookie as an Authorization header.
    fetch("/api/profile", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then((res) => {
        if (!active) return;
        if (res.ok) {
          resolveAuthenticatedLandingRoute("")
            .then((route) => {
              if (active) router.replace(route);
            })
            .catch(() => {
              if (active) router.replace("/login");
            });
        } else {
          router.replace("/login");
        }
      })
      .catch(() => {
        if (!active) return;
        // Network error — redirect to login as fallback
        router.replace("/login");
      });

    // Hard navigation fallback if the API call hangs (5s timeout)
    const hardNav = setTimeout(() => {
      if (!active) return;
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }, 5000);

    return () => {
      active = false;
      clearTimeout(hardNav);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <p className="text-sm text-muted">Redirecionando...</p>
    </div>
  );
}
