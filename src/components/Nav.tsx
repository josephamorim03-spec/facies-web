"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { usePathname } from "next/navigation";
import {
  isStudyImportImmersivePath,
} from "@/lib/studyImportRuntime";
import { useDesktopNavigationMode } from "@/lib/useDesktopNavigationMode";
import { getCronogramaAgendaHref } from "@/app/cronograma/_lib/viewModeSession";
import { NAV_GROUPS_CONFIG, isNavItemActive } from "@/lib/navConfig";
import { ACTIVATE_ROUTE } from "@/lib/initialGoalSetup";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSessionNavGuard } from "@/hooks/useSessionNavGuard";
import { ConfirmDialog } from "@/components/ConfirmDialog";


function IconCalendar({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconNotebook({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <line x1="8" y1="3" x2="8" y2="21" />
      <line x1="12" y1="8" x2="16" y2="8" />
      <line x1="12" y1="12" x2="16" y2="12" />
      <line x1="12" y1="16" x2="16" y2="16" />
    </svg>
  );
}

function IconCards({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="4" y="7" width="12" height="12" rx="1.5" />
      <rect x="8" y="5" width="12" height="12" rx="1.5" />
    </svg>
  );
}

function IconSliders({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconMenu({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function KrosmedIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/kroslogo-menu.png" alt="" aria-hidden="true" className={className} />
  );
}

type IconComponent = (props: { className?: string }) => React.JSX.Element;

const ICON_MAP: Record<string, IconComponent> = {
  "/agenda-operacional": IconCalendar,
  "/cards-adaptativos": IconCards,
  "/banco-de-questoes": IconNotebook,
  "/dados-e-relatorios": IconChart,
  "/rotina-e-metas": IconSliders,
};

const NAV_GROUPS = NAV_GROUPS_CONFIG.map((group) => ({
  items: group.items.map((item) => ({
    ...item,
    Icon: ICON_MAP[item.href] ?? IconNotebook,
  })),
}));

export const NAV_OPEN_EVENT = "kros:open-nav";

function useNavHideCompletely(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname === ACTIVATE_ROUTE ||
    isStudyImportImmersivePath(pathname)
  );
}

function resolveNavHref(href: string): string {
  if (href === "/agenda-operacional") return getCronogramaAgendaHref();
  return href;
}

// --- Main Nav (drawer + hamburger) -------------------------------------------

export default function Nav() {
  const pathname = usePathname();
  const isDesktopNavigation = useDesktopNavigationMode();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const historyAnchorPathRef = useRef<string | null>(null);
  const hideCompletely = useNavHideCompletely(pathname);

  const {
    exitConfirmOpen,
    logoutConfirmOpen,
    handleNavClick,
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

  const hideHamburger =
    pathname === "/cronograma"
    || pathname === "/agenda-operacional"
    || pathname === "/desempenho"
    || pathname === "/perfil"
    || pathname === "/rotina-e-metas"
    || pathname === "/revisao-turbo"
    || pathname === "/cards-adaptativos"
    || pathname === "/banco-de-questoes"
    || pathname === "/caderno"
    || pathname === "/estatisticas"
    || pathname === "/dados-e-relatorios"
    || pathname === "/today"
    || pathname === "/semana"
    || pathname === "/estatisticas/graficos"
    || pathname === "/dados-e-relatorios/graficos"
    || pathname.startsWith("/estatisticas/relatorio")
    || pathname.startsWith("/dados-e-relatorios/relatorio");
  const drawerVisible = drawerOpen && !isDesktopNavigation;

  return (
    <>
      {!hideHamburger && (
        <button
          onClick={() => setDrawerOpen(true)}
          className={`p-2 -ml-2 text-ink ${isDesktopNavigation ? "hidden" : ""}`}
          aria-label="Menu"
        >
          <IconMenu className="w-5 h-5" />
        </button>
      )}

      {/* Drawer overlay */}
      {drawerVisible && (
        <div className="fixed inset-0 z-50" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <nav
            className="drawer-enter absolute left-0 top-0 flex h-full w-64 flex-col border-r border-edge bg-paper p-6 shadow-[var(--soft-shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center">
              <div className="flex items-center gap-2">
                <KrosmedIcon className="w-6 h-6 shrink-0" />
                <span className="font-serif text-base text-ink tracking-wide">KrosMed</span>
              </div>
            </div>
            <div className="flex-1 space-y-1">
              {NAV_GROUPS.map((group, gi) => (
                <div key={gi}>
                  {gi > 0 && <hr className="border-edge my-3" />}
                  {group.items.map((item) => {
                    const { href, shortLabel, Icon } = item;
                    const active = isNavItemActive(pathname, item);
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={(e: MouseEvent<HTMLAnchorElement>) => handleNavClick(e, resolveNavHref(href))}
                        aria-current={active ? "page" : undefined}
                        data-nav-surface="drawer"
                        data-nav-item-href={href}
                        data-nav-active={active ? "true" : "false"}
                        className={`flex items-center gap-3 whitespace-nowrap rounded-xl border px-3 py-2.5 text-sm font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          active
                            ? "border-primary bg-surface text-ink shadow-sm"
                            : "border-transparent text-muted hover:bg-surfaceMuted hover:text-ink"
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        {shortLabel}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-auto pt-4 border-t border-edge">
              <div className="flex items-center justify-between px-2">
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
        title="Confirmar saída"
        message="Deseja sair da sessão? O progresso será perdido."
        cancelLabel="Continuar"
        confirmLabel="Sair"
        onCancel={cancelExit}
        onConfirm={confirmExit}
      />
      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Sair da conta"
        message="Deseja encerrar sua sessão neste dispositivo?"
        cancelLabel="Cancelar"
        confirmLabel="Sair"
        onCancel={cancelLogout}
        onConfirm={confirmLogout}
      />
    </>
  );
}

// --- Sidebar Nav (desktop >= md) -------------------------------------------

export function SidebarNav({ isDesktopNavigation }: { isDesktopNavigation: boolean }) {
  const pathname = usePathname();
  const hideCompletely = useNavHideCompletely(pathname);

  const {
    exitConfirmOpen,
    logoutConfirmOpen,
    handleNavClick,
    cancelExit,
    confirmExit,
    requestLogout,
    cancelLogout,
    confirmLogout,
  } = useSessionNavGuard({ pathname });

  if (hideCompletely || !isDesktopNavigation) return null;

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 flex w-52 flex-col border-r border-edge bg-paper">
        {/* Wordmark */}
        <div className="border-b border-edge px-6 py-6">
          <div className="flex items-center gap-2">
            <KrosmedIcon className="w-6 h-6 shrink-0" />
            <span className="font-serif text-base text-ink tracking-wide">KrosMed</span>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 px-2 py-4" aria-label="Navegação principal">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && <hr className="border-edge my-3 mx-1" />}
              {group.items.map((item) => {
                const { href, shortLabel, Icon } = item;
                const active = isNavItemActive(pathname, item);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={(e: MouseEvent<HTMLAnchorElement>) => handleNavClick(e, resolveNavHref(href))}
                    title={shortLabel}
                    data-nav-surface="sidebar"
                    data-nav-item-href={href}
                    data-nav-active={active ? "true" : "false"}
                    className={`flex w-full min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-xs font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                      ${active
                        ? "border-primary bg-surface text-ink shadow-sm"
                        : "border-transparent text-muted hover:bg-surfaceMuted hover:text-ink"
                      }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate" title={shortLabel}>{shortLabel}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout + Theme toggle */}
        <div className="border-t border-edge px-3 py-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={requestLogout}
              className="rounded-xl px-3 py-2.5 text-xs text-muted transition-colors hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Sair da conta
            </button>
            <ThemeToggle className="px-3 py-2.5" />
          </div>
        </div>
      </aside>

      <ConfirmDialog
        open={exitConfirmOpen}
        title="Confirmar saída da sessão"
        message="Deseja abandonar a sessão? O progresso será perdido."
        cancelLabel="Continuar revisão"
        confirmLabel="Sair da sessão"
        onCancel={cancelExit}
        onConfirm={confirmExit}
      />
      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Sair da conta"
        message="Deseja encerrar sua sessão neste dispositivo?"
        cancelLabel="Cancelar"
        confirmLabel="Sair"
        onCancel={cancelLogout}
        onConfirm={confirmLogout}
      />
    </>
  );
}

export function BottomTabBar() {
  return null;
}
