"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { useEdgeSwipeSuppression } from "@/hooks/useEdgeSwipeSuppression";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { KrosGlyph, type KrosGlyphMotion } from "@/components/KrosGlyph";
import {
  CalendarDays,
  ChartNoAxesCombined,
  CircleUserRound,
  House,
  Layers3,
  LibraryBig,
  Navigation,
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
  // A Rota e navegacao: a seta de GPS diz o que a tela faz melhor que o glifo
  // da marca, que agora vive na status bar e no boot.
  rota: Navigation,
  cards: Layers3,
  profile: CircleUserRound,
  // Chaves que a taxonomia de 5 abas absorveu: `evolution` e `planning`
  // viraram FILHOS de Perfil e Inicio, nao abas proprias.
  evolution: ChartNoAxesCombined,
  planning: CalendarDays,
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
  if (icon === "rota") return <KrosGlyph className={className} motion={krosMotion} />;
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

/**
 * Guardas globais de navegacao + supressao do swipe de borda.
 *
 * O drawer mobile SAIU: a navegacao agora e `MobileTabBar` (barra inferior) no
 * mobile e `SidebarNav` no desktop. O que sobrou aqui nunca foi menu — e o
 * dialogo de "sair da sessao" (disparado pelo guard de rota) e o supressor de
 * edge-swipe, que precisa continuar montado em toda tela com chrome.
 *
 * O botao de sair da conta e o seletor de tema, que so existiam dentro do
 * drawer, mudaram para `/preferencias`: no mobile o drawer era o UNICO lugar
 * onde eles apareciam, porque `SidebarNav` renderiza `null` sem desktop.
 */
export default function Nav() {
  const pathname = usePathname();
  const hideCompletely = useNavHideCompletely(pathname);

  const { exitConfirmOpen, cancelExit, confirmExit } = useSessionNavGuard({ pathname });

  // Nao e gesto de menu: ver `hooks/useEdgeSwipeSuppression.ts`. E o que impede o
  // swipe de borda do iOS/Android de sequestrar o gesto horizontal do TurboCard e
  // do CalendarGrid.
  useEdgeSwipeSuppression(!hideCompletely);

  if (hideCompletely) return null;

  return (
    <ConfirmDialog
      open={exitConfirmOpen}
      title="Sair da sessão?"
      message="O progresso será perdido."
      cancelLabel="Continuar"
      confirmLabel="Sair da sessão"
      onCancel={cancelExit}
      onConfirm={confirmExit}
    />
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
                // A Rota (ex-Kros) ganha uma superfície de acento levíssima em
                // repouso — presente sem imitar o estado "selecionado".
                const restingClass =
                  icon === "rota"
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
