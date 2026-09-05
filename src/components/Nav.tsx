"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCronogramaAgendaHref } from "@/app/cronograma/_lib/viewModeSession";
import { NAV_GROUPS_CONFIG, isNavItemActive } from "@/lib/navConfig";
import { FaciesWordmark } from "@/components/FaciesWordmark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FastNavLink } from "@/components/FastNavLink";
import { useSessionNavGuard } from "@/hooks/useSessionNavGuard";
import { useEdgeSwipeSuppression } from "@/hooks/useEdgeSwipeSuppression";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deveEsconderChrome } from "@/lib/chromeVisibility";
import { NavIcon } from "@/components/navIcons";

const NAV_GROUPS = NAV_GROUPS_CONFIG;

export const NAV_OPEN_EVENT = "kros:open-nav";

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
        className={`${dim} object-cover shrink-0 border border-edge`} />
    );
  }
  return (
    <span className={`${dim} bg-primary flex items-center justify-center font-semibold text-primaryInk shrink-0`}>
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
  const hideCompletely = deveEsconderChrome(pathname);

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

// --- Barra superior (desktop >= md) ------------------------------------------

/**
 * A barra superior do desktop — o `12a`/`11a`.
 *
 * O wordmark, o qualificador "a cara da sua prova" e o avatar vivem aqui, em
 * largura total, acima da sidebar. No desenho a prova-alvo ("UNIFESP · 63 dias")
 * também fica à direita; aqui ela continua dentro de cada tela (`/hoje`), de
 * propósito, para não duplicar a mesma linha em duas superfícies do mesmo
 * viewport.
 *
 * O avatar é A PORTA DA CONTA — a mesma convenção que já valia no rodapé da
 * sidebar. Ele subiu para a barra superior porque é ali que o `12a` o desenha,
 * e porque "conta" continua fora da lista de destinos (decisão registrada em
 * `navConfig.ts`).
 */
export function DesktopTopBar({
  isDesktopNavigation,
  displayName,
  photoUrl,
}: {
  isDesktopNavigation: boolean;
  displayName?: string | null;
  photoUrl?: string | null;
}) {
  const pathname = usePathname();
  const hideCompletely = deveEsconderChrome(pathname);

  if (hideCompletely || !isDesktopNavigation) return null;

  return (
    <header
      data-nav-surface="topbar"
      className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-edge bg-surface px-8"
    >
      <div className="flex min-w-0 items-center gap-3">
        <FaciesWordmark size="sm" />
        <span aria-hidden="true" className="h-4 w-px shrink-0 bg-rule" />
        <span className="paper-eyebrow truncate">a cara da sua prova</span>
      </div>
      {(displayName || photoUrl) ? (
        <Link
          href="/conta"
          aria-label="Sua conta"
          title={displayName ?? "Conta"}
          className="flex shrink-0 items-center"
        >
          <UserAvatar photoUrl={photoUrl} displayName={displayName} size="sm" />
        </Link>
      ) : (
        <span className="w-7" aria-hidden="true" />
      )}
    </header>
  );
}

// --- Sidebar Nav (desktop >= md) -------------------------------------------

export function SidebarNav({
  isDesktopNavigation,
}: {
  isDesktopNavigation: boolean;
}) {
  const pathname = usePathname();
  const hideCompletely = deveEsconderChrome(pathname);

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
        data-nav-surface="sidebar"
        className="fixed bottom-0 left-0 top-14 z-30 flex w-56 flex-col overflow-hidden border-r border-edge bg-paper"
      >
        {/* Nav items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-1.5 py-4" aria-label="Navegação principal">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && <hr className="border-edge my-3 mx-1" />}
              {group.items.map((item) => {
                const { href, shortLabel, icon } = item;
                const active = isNavItemActive(pathname, item);
                // A superfície de acento em repouso saiu com a aba Rota: ela
                // marcava UM destino como especial, e nenhum dos quatro é.
                const restingClass =
                  "border-transparent text-muted hover:bg-surfaceMuted hover:text-ink";
                return (
                  <FastNavLink
                    key={href}
                    href={resolveNavHref(href)}
                    onNavigateGuard={guardNavigation}
                    title={shortLabel}
                    data-nav-surface="sidebar"
                    data-nav-item-href={href}
                    data-nav-active={active ? "true" : "false"}
                    className={`paper-control flex min-h-11 w-full min-w-0 items-center border gap-3 px-2.5 text-xs font-medium leading-tight focus-visible:outline-none ${
                      active ? "border-primary bg-surface text-ink" : restingClass
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <NavIcon icon={icon} className="w-5 h-5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate whitespace-nowrap" title={shortLabel}>{shortLabel}</span>
                  </FastNavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout + Theme */}
        <div className="border-t border-edge shrink-0">
          <div className="flex items-center justify-between px-3 py-2.5">
            <button type="button" onClick={requestLogout}
              className="px-3 py-2 text-xs text-muted transition-colors hover:bg-surfaceMuted hover:text-ink">
              Sair da conta
            </button>
            <ThemeToggle className="px-2 py-2" />
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
