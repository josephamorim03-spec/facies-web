"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  isStudyImportImmersivePath,
} from "@/lib/studyImportRuntime";
import { useDesktopNavigationMode } from "@/lib/useDesktopNavigationMode";
import { getCronogramaAgendaHref } from "@/app/cronograma/_lib/viewModeSession";
import { NAV_GROUPS_CONFIG, isNavItemActive } from "@/lib/navConfig";
import { ACTIVATE_ROUTE } from "@/lib/initialGoalSetup";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FastNavLink } from "@/components/FastNavLink";
import { useSessionNavGuard } from "@/hooks/useSessionNavGuard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { getAuthToken } from "@/lib/auth";
import { warmRoute, warmRouteData } from "@/lib/navigationWarmup";
import { KrosGlyph, type KrosGlyphMotion } from "@/components/KrosGlyph";
import {
  CalendarDays,
  ChartNoAxesCombined,
  CircleUserRound,
  House,
  Layers3,
  LibraryBig,
  Settings,
  type LucideIcon,
} from "lucide-react";


function KrosmedIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/kros-logo-vector.svg"
      alt=""
      aria-hidden="true"
      className={[className, "dark:invert dark:brightness-[1.08]"].filter(Boolean).join(" ")}
    />
  );
}

const ICON_MAP: Record<string, LucideIcon> = {
  today: House,
  bank: LibraryBig,
  cards: Layers3,
  evolution: ChartNoAxesCombined,
  planning: CalendarDays,
  profile: CircleUserRound,
  settings: Settings,
};

/**
 * A Kros não usa ícone do Lucide: é o glifo próprio, que anima. Os demais
 * destinos seguem o mapa acima.
 */
function NavIcon({
  icon,
  className,
  krosMotion = "ambient",
}: {
  icon: string;
  className?: string;
  krosMotion?: KrosGlyphMotion;
}) {
  if (icon === "kros") return <KrosGlyph className={className} motion={krosMotion} />;
  const Icon = ICON_MAP[icon] ?? LibraryBig;
  return <Icon className={className} />;
}

const NAV_GROUPS = NAV_GROUPS_CONFIG;

/**
 * Dispara a animação de apresentação do glifo quando a superfície de navegação
 * abre (sidebar expandindo ou drawer). Volta ao loop ambiente ao terminar.
 */
const KROS_WAKE_MS = 2000;

function useKrosWake(open: boolean): KrosGlyphMotion {
  const [motion, setMotion] = useState<KrosGlyphMotion>("ambient");
  const [previousOpen, setPreviousOpen] = useState(open);

  // Ajuste de estado durante a renderização — o padrão do React para reagir à
  // mudança de uma prop, em vez de um efeito que dispara render em cascata.
  if (open !== previousOpen) {
    setPreviousOpen(open);
    if (open) setMotion("wake");
  }

  useEffect(() => {
    if (motion !== "wake") return;
    const timer = window.setTimeout(() => setMotion("ambient"), KROS_WAKE_MS);
    return () => window.clearTimeout(timer);
  }, [motion]);

  return motion;
}

export const NAV_OPEN_EVENT = "kros:open-nav";

function useNavHideCompletely(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname === ACTIVATE_ROUTE ||
    // Immersive question/simulado runner — the session page has its own exit.
    pathname.startsWith("/banco/sessao") ||
    isStudyImportImmersivePath(pathname)
  );
}

function resolveNavHref(href: string): string {
  if (href === "/agenda-operacional" || href === "/calendario") return getCronogramaAgendaHref();
  if (href === "/hoje") return "/hoje";
  return href;
}

// --- User Avatar ---------------------------------------------------------------

function UserAvatar({ photoUrl, displayName, size = "sm" }: { photoUrl?: string | null; displayName?: string | null; size?: "sm" | "md" }) {
  const dim = size === "md" ? "w-9 h-9 text-sm" : "w-7 h-7 text-xs";
  const initial = (displayName ?? "?").trim()[0]?.toUpperCase() ?? "?";
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt={displayName ?? "Usuário"} referrerPolicy="no-referrer"
        className={`${dim} rounded-full object-cover shrink-0 border border-edge`} />
    );
  }
  return (
    <span className={`${dim} rounded-full bg-primary flex items-center justify-center font-semibold text-primaryInk shrink-0`}>
      {initial}
    </span>
  );
}

// --- Main Nav (drawer + hamburger) -------------------------------------------

export default function Nav({ displayName, photoUrl }: { displayName?: string | null; photoUrl?: string | null } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const isDesktopNavigation = useDesktopNavigationMode();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const historyAnchorPathRef = useRef<string | null>(null);
  const hideCompletely = useNavHideCompletely(pathname);
  const krosMotion = useKrosWake(drawerOpen && !isDesktopNavigation && !hideCompletely);

  const {
    exitConfirmOpen,
    logoutConfirmOpen,
    guardNavigation,
    cancelExit,
    confirmExit,
    requestLogout,
    cancelLogout,
    confirmLogout,
  } = useSessionNavGuard({ pathname, onCloseDrawer: () => setDrawerOpen(false) });

  // Allow other components to open the drawer via custom event
  useEffect(() => {
    const handler = () => {
      if (!isDesktopNavigation) setDrawerOpen(true);
    };
    window.addEventListener(NAV_OPEN_EVENT, handler);
    return () => window.removeEventListener(NAV_OPEN_EVENT, handler);
  }, [isDesktopNavigation]);

  useEffect(() => {
    if (!drawerOpen || isDesktopNavigation || hideCompletely) return;
    const token = getAuthToken();
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        const href = resolveNavHref(item.href);
        warmRoute(href, router);
        warmRouteData(href, token);
      }
    }
  }, [drawerOpen, hideCompletely, isDesktopNavigation, router]);

  useEffect(() => {
    if (hideCompletely) return;
    if ((navigator.maxTouchPoints ?? 0) <= 0) return;

    const EDGE_ZONE_PX = 24;
    const BROWSER_EDGE_PX = 16;
    const HORIZONTAL_START_PX = 14;
    const AXIS_MARGIN_PX = 8;
    let tracking = false;
    let suppressing = false;
    let startX = 0;
    let startY = 0;
    let touchId: number | null = null;

    function isAllowedHorizontalSwipeTarget(target: EventTarget | null): boolean {
      if (!(target instanceof Element)) return false;
      return Boolean(target.closest("[data-allow-horizontal-swipe='true']"));
    }

    function isInteractiveEdgeTarget(target: EventTarget | null): boolean {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest("button, a, input, textarea, select, [role='button'], [contenteditable='true']"),
      );
    }

    function getTrackedTouch(list: TouchList): Touch | null {
      if (touchId !== null) {
        for (let i = 0; i < list.length; i += 1) {
          const touch = list.item(i);
          if (touch && touch.identifier === touchId) return touch;
        }
      }
      return list.length > 0 ? list.item(0) : null;
    }

    function clearGestureState() {
      tracking = false;
      suppressing = false;
      touchId = null;
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) {
        clearGestureState();
        return;
      }
      const touch = e.touches.item(0);
      if (!touch) {
        clearGestureState();
        return;
      }
      const viewportWidth = window.innerWidth;
      const nearEdge = touch.clientX <= EDGE_ZONE_PX || touch.clientX >= viewportWidth - EDGE_ZONE_PX;
      if (!nearEdge) {
        clearGestureState();
        return;
      }
      if (isInteractiveEdgeTarget(e.target)) {
        clearGestureState();
        return;
      }
      if (isAllowedHorizontalSwipeTarget(e.target)) {
        const atBrowserEdge = touch.clientX <= BROWSER_EDGE_PX || touch.clientX >= viewportWidth - BROWSER_EDGE_PX;
        if (atBrowserEdge && e.cancelable) e.preventDefault();
        clearGestureState();
        return;
      }
      tracking = true;
      suppressing = false;
      startX = touch.clientX;
      startY = touch.clientY;
      touchId = touch.identifier;

      if (e.cancelable) e.preventDefault();
    }

    function onTouchMove(e: TouchEvent) {
      if (!tracking) return;
      const touch = getTrackedTouch(e.touches);
      if (!touch) {
        clearGestureState();
        return;
      }
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (!suppressing) {
        if (absX < HORIZONTAL_START_PX && absY < HORIZONTAL_START_PX) return;
        if (absX > absY + AXIS_MARGIN_PX) {
          suppressing = true;
        } else if (absY > absX + AXIS_MARGIN_PX) {
          clearGestureState();
          return;
        } else {
          return;
        }
      }

      if (e.cancelable) e.preventDefault();
    }

    window.addEventListener("touchstart", onTouchStart, { capture: true, passive: false });
    window.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
    window.addEventListener("touchend", clearGestureState, { capture: true });
    window.addEventListener("touchcancel", clearGestureState, { capture: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart, { capture: true });
      window.removeEventListener("touchmove", onTouchMove, { capture: true });
      window.removeEventListener("touchend", clearGestureState, { capture: true });
      window.removeEventListener("touchcancel", clearGestureState, { capture: true });
    };
  }, [hideCompletely]);

  useEffect(() => {
    if (hideCompletely) return;
    if (historyAnchorPathRef.current === pathname) return;
    historyAnchorPathRef.current = pathname;
    window.history.replaceState(
      { ...(window.history.state ?? {}), krosMenuAnchor: true, path: pathname, at: Date.now() },
      "",
      pathname,
    );
  }, [hideCompletely, pathname]);

  if (hideCompletely) return null;

  const drawerVisible = drawerOpen && !isDesktopNavigation;

  return (
    <>
      {/* Drawer overlay */}
      {drawerVisible && (
        <div className="fixed inset-0 z-50" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <nav
            className="drawer-enter absolute left-0 top-0 flex h-full w-64 flex-col border-r border-edge bg-paper p-6 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center">
              <div className="flex items-center gap-2">
                <KrosmedIcon className="w-6 h-6 shrink-0" />
                <span className="font-serif text-base font-semibold tracking-[0.06em] uppercase"><span className="text-ink">KROS</span><span className="text-primary dark:text-ink">MED</span></span>
              </div>
            </div>
            <div className="flex-1 space-y-1">
              {NAV_GROUPS.map((group, gi) => (
                <div key={gi}>
                  {gi > 0 && <hr className="border-edge my-3" />}
                  {group.items.map((item) => {
                    const { href, shortLabel, icon } = item;
                    const active = isNavItemActive(pathname, item);
                    // A Kros ganha uma superfície teal levíssima em repouso —
                    // presente sem imitar o estado "selecionado".
                    const restingClass =
                      icon === "kros"
                        ? "nav-kros-item"
                        : "border-transparent text-muted hover:bg-surfaceMuted hover:text-ink";
                    return (
                      <FastNavLink
                        key={href}
                        href={resolveNavHref(href)}
                        onNavigateGuard={guardNavigation}
                        aria-current={active ? "page" : undefined}
                        data-nav-surface="drawer"
                        data-nav-item-href={href}
                        data-nav-active={active ? "true" : "false"}
                        className={`flex items-center gap-3 whitespace-nowrap rounded-xl border px-3 py-2.5 text-sm font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          active ? "border-primary bg-surface text-ink shadow-sm" : restingClass
                        }`}
                      >
                        <NavIcon icon={icon} className="w-5 h-5 shrink-0" krosMotion={krosMotion} />
                        {shortLabel}
                      </FastNavLink>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-auto border-t border-edge">
              {(displayName || photoUrl) && (
                // Identidade, não atalho: Perfil virou item do menu, e manter o
                // avatar clicável para o mesmo destino obrigava a aprender dois
                // caminhos para a mesma tela.
                <div className="flex items-center gap-2.5 border-b border-edge px-4 py-3">
                  <UserAvatar photoUrl={photoUrl} displayName={displayName} />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                    {displayName?.split(" ")[0] ?? ""}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between px-2 py-2">
                <button
                  type="button"
                  onClick={requestLogout}
                  className="rounded-xl px-2 py-2.5 text-xs text-muted transition-colors hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm"
                >
                  Sair da conta
                </button>
                <ThemeToggle />
              </div>
            </div>
          </nav>
        </div>
      )}

      <ConfirmDialog
        open={exitConfirmOpen}
        title="Sair da sessão?"
        message="O progresso será perdido."
        cancelLabel="Continuar"
        confirmLabel="Sair da sessão"
        onCancel={cancelExit}
        onConfirm={confirmExit}
      />
      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Sair da conta?"
        message="Encerrar a sessão neste dispositivo?"
        cancelLabel="Cancelar"
        confirmLabel="Sair"
        onCancel={cancelLogout}
        onConfirm={confirmLogout}
      />
    </>
  );
}

// --- Sidebar Nav (desktop >= md) -------------------------------------------

export function SidebarNav({
  isDesktopNavigation,
  displayName,
  photoUrl,
}: {
  isDesktopNavigation: boolean;
  displayName?: string | null;
  photoUrl?: string | null;
}) {
  const pathname = usePathname();
  const hideCompletely = useNavHideCompletely(pathname);
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const visible = hovered || pinned;
  const krosMotion = useKrosWake(visible && !hideCompletely && isDesktopNavigation);

  const {
    exitConfirmOpen,
    logoutConfirmOpen,
    guardNavigation,
    cancelExit,
    confirmExit,
    requestLogout,
    cancelLogout,
    confirmLogout,
  } = useSessionNavGuard({ pathname });

  if (hideCompletely || !isDesktopNavigation) return null;

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col overflow-hidden border-r border-edge bg-paper transition-[width] duration-200 ease-out ${visible ? "w-52" : "w-14"}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setHovered(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHovered(false);
        }}
      >
        {/* Wordmark — link para a home */}
        <Link
          href="/hoje"
          className="block border-b border-edge transition-colors shrink-0 hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ padding: visible ? "1.25rem 1rem" : "0.875rem 0.625rem" }}
          aria-label="KrosMed — início"
        >
          <div className={`flex items-center gap-2 ${!visible ? "justify-center" : ""}`}>
            <KrosmedIcon className="w-6 h-6 shrink-0" />
            {visible && (
              <span className="font-serif text-base font-semibold tracking-[0.06em] uppercase whitespace-nowrap"><span className="text-ink">KROS</span><span className="text-primary dark:text-ink">MED</span></span>
            )}
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setPinned((value) => !value)}
          aria-expanded={visible}
          aria-label={pinned ? "Recolher navegação" : "Manter navegação expandida"}
          className={`paper-control mx-1.5 mt-2 flex min-h-10 items-center border border-transparent text-xs text-muted hover:border-edge hover:bg-surfaceMuted hover:text-ink ${visible ? "justify-between px-2.5" : "justify-center"}`}
        >
          {visible ? <span>{pinned ? "Recolher" : "Fixar aberta"}</span> : null}
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={`h-4 w-4 transition-transform ${visible ? "rotate-180" : ""}`} aria-hidden="true">
            <path d="m7 4 6 6-6 6" />
          </svg>
        </button>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 px-1.5 py-4 overflow-y-auto" aria-label="Navegação principal">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && <hr className="border-edge my-3 mx-1" />}
              {group.items.map((item) => {
                const { href, shortLabel, icon } = item;
                const active = isNavItemActive(pathname, item);
                // A Kros ganha uma superfície teal levíssima em repouso —
                // presente sem imitar o estado "selecionado".
                const restingClass =
                  icon === "kros"
                    ? "nav-kros-item"
                    : "border-transparent text-muted hover:bg-surfaceMuted hover:text-ink";
                return (
                  <FastNavLink
                    key={href}
                    href={resolveNavHref(href)}
                    onNavigateGuard={guardNavigation}
                    title={shortLabel}
                    data-nav-surface="sidebar"
                    data-nav-item-href={href}
                    data-nav-active={active ? "true" : "false"}
                    className={`paper-control flex min-h-11 w-full min-w-0 items-center border text-xs font-medium leading-tight focus-visible:outline-none ${visible ? "gap-3 px-2.5" : "justify-center px-0"} ${
                      active ? "border-primary bg-surface text-ink" : restingClass
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <NavIcon icon={icon} className="w-5 h-5 shrink-0" krosMotion={krosMotion} />
                    {visible && <span className="min-w-0 flex-1 truncate whitespace-nowrap" title={shortLabel}>{shortLabel}</span>}
                  </FastNavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User info + Logout + Theme */}
        <div className="border-t border-edge shrink-0">
          {(displayName || photoUrl) && (
            <div
              className={`flex items-center border-b border-edge ${visible ? "gap-2.5 px-4 py-3" : "justify-center py-3"}`}
            >
              <UserAvatar photoUrl={photoUrl} displayName={displayName} size={visible ? "md" : "sm"} />
              {visible && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-ink truncate">{displayName?.split(" ")[0] ?? ""}</p>
                  {displayName?.includes(" ") && (
                    <p className="text-[10px] text-muted truncate leading-tight">{displayName.split(" ").slice(1).join(" ")}</p>
                  )}
                </div>
              )}
            </div>
          )}
          <div className={`flex items-center ${visible ? "justify-between px-3" : "justify-center"} py-2.5`}>
            {visible ? (
              <>
                <button type="button" onClick={requestLogout}
                  className="rounded-xl px-3 py-2 text-xs text-muted transition-colors hover:bg-surfaceMuted hover:text-ink">
                  Sair da conta
                </button>
                <ThemeToggle className="px-2 py-2" />
              </>
            ) : (
              <ThemeToggle className="p-1.5" />
            )}
          </div>
        </div>
      </aside>

      <ConfirmDialog
        open={exitConfirmOpen}
        title="Sair da sessão?"
        message="O progresso será perdido."
        cancelLabel="Continuar"
        confirmLabel="Sair da sessão"
        onCancel={cancelExit}
        onConfirm={confirmExit}
      />
      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Sair da conta?"
        message="Encerrar a sessão neste dispositivo?"
        cancelLabel="Cancelar"
        confirmLabel="Sair"
        onCancel={cancelLogout}
        onConfirm={confirmLogout}
      />
    </>
  );
}
