"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDesktopNavigationMode } from "@/lib/useDesktopNavigationMode";
import { getCronogramaAgendaHref } from "@/app/cronograma/_lib/viewModeSession";
import { NAV_GROUPS_CONFIG, isNavItemActive } from "@/lib/navConfig";
import { FaciesMark, FaciesWordmark } from "@/components/FaciesWordmark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FastNavLink } from "@/components/FastNavLink";
import { UserAvatar } from "@/components/UserAvatar";
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

// O avatar mudou para `components/UserAvatar.tsx`: com a aba "Você" no
// celular ele passou a ter dois consumidores, e componente local com dois donos
// e' o primeiro passo para duas copias que divergem.

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
  const hideCompletely = deveEsconderChrome(pathname);
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const visible = hovered || pinned;

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
        {/* Wordmark — marca, nao navegacao.
            Era um <Link href="/hoje"> com hover de fundo. A aba "Hoje" ja e o
            caminho para a home, e um segundo alvo clicavel para o mesmo destino
            so acrescenta uma coisa que reage ao mouse sem levar a lugar novo. */}
        <div
          className="block border-b border-edge shrink-0"
          style={{ padding: visible ? "1.25rem 1rem" : "0.875rem 0.625rem" }}
        >
          {/* Uma marca so em todo o app: login, sidebar e cabecalho. O <img> do
              logo vetor saiu junto com o hack de `dark:invert` que ele exigia —
              o wordmark responde ao tema por token. Recolhida, a sidebar mostra
              o acento, que E' a marca (§3.4), e nao uma inicial. */}
          <div className={`flex items-center gap-2 ${!visible ? "justify-center" : ""}`}>
            {visible ? <FaciesWordmark size="sm" /> : <FaciesMark />}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPinned((value) => !value)}
          aria-expanded={visible}
          aria-label={pinned ? "Recolher navegação" : "Manter navegação expandida"}
          className={`paper-control mx-1.5 mt-2 flex min-h-10 items-center border border-transparent text-xs text-muted hover:border-edge hover:bg-surfaceMuted hover:text-ink ${visible ? "justify-between px-2.5" : "justify-center"}`}
        >
          {visible ? <span>{pinned ? "Recolher" : "Fixar aberta"}</span> : null}
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 transition-transform ${visible ? "rotate-180" : ""}`} aria-hidden="true">
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
                    className={`paper-control flex min-h-11 w-full min-w-0 items-center border text-xs font-medium leading-tight focus-visible:outline-none ${visible ? "gap-3 px-2.5" : "justify-center px-0"} ${
                      active ? "border-primary bg-surface text-ink" : restingClass
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <NavIcon icon={icon} className="w-5 h-5 shrink-0" />
                    {visible && <span className="min-w-0 flex-1 truncate whitespace-nowrap" title={shortLabel}>{shortLabel}</span>}
                  </FastNavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User info + Logout + Theme */}
        <div className="border-t border-edge shrink-0">
          {/* O AVATAR É A PORTA DA CONTA, e ela saiu da lista principal.
              `Conta` ficava lado a lado com Hoje, Banco e Rotina — mesmo peso
              visual que as telas de estudo, competindo com elas todo dia por
              algo que se abre poucas vezes por ano (trocar senha, exportar
              dados, encerrar).

              Aqui ela some da barra sem sumir do produto: quem procura conta
              procura o próprio nome, e é nele que se clica. É a convenção que
              já existe fora daqui, então não precisa ser ensinada.

              ⚠️ E O DESTINO MUDOU PARA `/voce`, com a barra de cinco.

              Enquanto a Conta era o quinto item da rail, este avatar apontava
              para o MESMO lugar que ele -- duas portas para um destino so, que
              nao competem. Com "Você" no lugar dela, apontar aqui para
              `/conta` criaria dois avatares identicos levando a telas
              diferentes, na mesma tela. A Conta continua a um toque, agora de
              dentro do `/voce`. */}
          {(displayName || photoUrl) && (
            <Link
              href="/voce"
              aria-label="Você"
              className={`flex items-center border-b border-edge transition-colors hover:bg-surfaceMuted ${visible ? "gap-2.5 px-4 py-3" : "justify-center py-3"}`}
            >
              <UserAvatar photoUrl={photoUrl} displayName={displayName} size={visible ? "md" : "sm"} />
              {visible && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-ink truncate">{displayName?.split(" ")[0] ?? ""}</p>
                  {displayName?.includes(" ") && (
                    <p className="text-micro text-muted truncate leading-tight">{displayName.split(" ").slice(1).join(" ")}</p>
                  )}
                </div>
              )}
            </Link>
          )}
          <div className={`flex items-center ${visible ? "justify-between px-3" : "justify-center"} py-2.5`}>
            {visible ? (
              <>
                <button type="button" onClick={requestLogout}
                  className="px-3 py-2 text-xs text-muted transition-colors hover:bg-surfaceMuted hover:text-ink">
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
