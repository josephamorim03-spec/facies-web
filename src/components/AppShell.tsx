"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Nav, { BottomTabBar, SidebarNav, NAV_OPEN_EVENT } from "@/components/Nav";
import PwaRegister from "@/components/PwaRegister";
import { ToastProvider } from "@/lib/useToast";
import { Toast } from "@/components/Toast";
import { isStudyImportImmersivePath } from "@/lib/studyImportRuntime";
import { getAuthToken } from "@/lib/auth";
import { api } from "@/lib/api/shared/http";
import { getProfile } from "@/lib/api";
import { getBlockedRedirectSessionKey } from "@/lib/storage-keys";
import { ACTIVATE_ROUTE, INITIAL_GOAL_SETUP_ROUTE } from "@/lib/initialGoalSetup";
import { useDesktopNavigationMode } from "@/lib/useDesktopNavigationMode";

type BuildVersionPayload = {
  commit_sha: string;
  build_time_utc: string;
  environment: string;
};

const SHOW_BUILD_BADGE = process.env.NEXT_PUBLIC_SHOW_BUILD_BADGE === "1";

function shouldHideNavigationChrome(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname === ACTIVATE_ROUTE ||
    isStudyImportImmersivePath(pathname)
  );
}

function IconMenu({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function MobileTopBar() {
  return (
    <header
      className="fixed inset-x-0 top-0 z-30 flex h-12 items-center justify-between border-b border-edge/50 bg-paper/80 px-4 backdrop-blur-md md:hidden"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)", height: "calc(3rem + env(safe-area-inset-top, 0px))" }}
    >
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent(NAV_OPEN_EVENT))}
        className="-ml-1 p-1.5 text-ink"
        aria-label="Menu"
      >
        <IconMenu className="h-5 w-5" />
      </button>
      <span className="font-serif text-sm font-semibold uppercase tracking-[0.1em] text-ink">KrosMed</span>
      <span className="w-8" aria-hidden="true" />
    </header>
  );
}

function BuildVersionBadge() {
  const [version, setVersion] = useState<BuildVersionPayload | null>(null);

  useEffect(() => {
    if (!SHOW_BUILD_BADGE) return;
    let cancelled = false;
    api<BuildVersionPayload>("/api/version", { cache: "no-store" })
      .then((payload) => {
        if (cancelled) return;
        setVersion(payload);
      })
      .catch(() => {
        if (cancelled) return;
        setVersion({
          commit_sha: "unknown",
          build_time_utc: "unknown",
          environment: process.env.NODE_ENV ?? "unknown",
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!version || !SHOW_BUILD_BADGE) return null;
  const env = (version.environment ?? "").toLowerCase();
  if (env !== "production" && env !== "preview") return null;

  const shortSha = version.commit_sha && version.commit_sha !== "unknown"
    ? version.commit_sha.slice(0, 7)
    : "unknown";
  const title = `commit=${version.commit_sha} | env=${version.environment} | build=${version.build_time_utc}`;

  return (
    <span
      title={title}
      className="pointer-events-none fixed right-2 z-[60] rounded border border-edge bg-paper/85 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted shadow-sm backdrop-blur supports-[backdrop-filter]:bg-paper/70 bottom-[calc(env(safe-area-inset-bottom,0px)+0.8rem)] md:bottom-3"
      aria-label={`Build ${shortSha}`}
    >
      build: {shortSha}
    </span>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const hideNavigationChrome = shouldHideNavigationChrome(pathname);
  const isDesktopNavigation = useDesktopNavigationMode();
  const blockedNavigationPathRef = useRef<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [pinnedSidebar, setPinnedSidebar] = useState(false);
  const mainClassName = hideNavigationChrome
    ? "min-h-screen"
    : isDesktopNavigation
      ? "max-w-lg md:max-w-5xl lg:max-w-6xl mx-auto px-4 md:px-6 pt-[max(1.5rem,env(safe-area-inset-top,0px))] pb-[calc(env(safe-area-inset-bottom,0px)+0.85rem)] md:pb-8"
      : "max-w-lg mx-auto px-4 pt-[calc(env(safe-area-inset-top,0px)+3.75rem)] pb-[calc(env(safe-area-inset-bottom,0px)+0.85rem)]";

  useEffect(() => {
    if (pathname === INITIAL_GOAL_SETUP_ROUTE) {
      blockedNavigationPathRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    if (
      pathname === "/" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/auth") ||
      pathname === ACTIVATE_ROUTE ||
      pathname === INITIAL_GOAL_SETUP_ROUTE
    ) {
      return;
    }

    const token = getAuthToken();
    const redirectSessionKey = getBlockedRedirectSessionKey(token || "http-only-session");

    let active = true;
    getProfile(token)
      .then((profile) => {
        if (!active) return;
        if (profile.display_name) setUserDisplayName(profile.display_name);
        if (profile.photo_url) setUserPhotoUrl(profile.photo_url);
        if (profile.access_status !== "active") {
          router.replace(ACTIVATE_ROUTE);
          return;
        }
        if (profile.has_completed_initial_goal_setup) return;
        if (blockedNavigationPathRef.current !== pathname) {
          blockedNavigationPathRef.current = pathname;
          try {
            sessionStorage.setItem(redirectSessionKey, "1");
          } catch {
            // ignore
          }
        }
        router.replace(INITIAL_GOAL_SETUP_ROUTE);
      })
      .catch(() => {
        // noop: keep current route when guard check fails transiently
      });

    return () => {
      active = false;
    };
  }, [pathname, router]);

  return (
    <>
      <PwaRegister />
      <SidebarNav isDesktopNavigation={isDesktopNavigation} displayName={userDisplayName} photoUrl={userPhotoUrl} pinned={pinnedSidebar} onPinChange={setPinnedSidebar} />
      {!hideNavigationChrome && !isDesktopNavigation && <MobileTopBar />}
      <div className={hideNavigationChrome || !isDesktopNavigation ? "" : (pinnedSidebar ? "ml-52" : "ml-14")}>
        <main className={mainClassName}>
          <Nav displayName={userDisplayName} photoUrl={userPhotoUrl} />
          {children}
        </main>
      </div>
      <BottomTabBar />
      <Toast />
      <BuildVersionBadge />
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppShellInner>{children}</AppShellInner>
    </ToastProvider>
  );
}
