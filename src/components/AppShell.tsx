"use client";

import { useContext, useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import Nav, { SidebarNav } from "@/components/Nav";
import { MobileTabBar, hasChildRow } from "@/components/MobileTabBar";
import { CommandBar } from "@/components/CommandBar";
import { IntentSubNav } from "@/components/student/IntentSubNav";
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
import { NavbarProvider, NavbarContext } from "@/lib/NavbarContext";
import { StudentExperienceProvider } from "@/lib/StudentExperienceContext";
import { ProfileDisplayNameProvider } from "@/lib/ProfileContext";
import { warmRoute, warmRouteData } from "@/lib/navigationWarmup";
import {
  acknowledgeSessionExpired,
  isSessionExpirationSuppressedPath,
  SESSION_EXPIRED_LOGIN_URL,
  startSessionExpiredRedirect,
  subscribeSessionExpired,
} from "@/lib/sessionExpiration";
import { startSessionKeepalive } from "@/lib/sessionKeepalive";
import { getStudentPageTitle } from "@/lib/navConfig";
import { QueryProvider } from "@/lib/QueryProvider";
import { MotionConfig } from "motion/react";

type BuildVersionPayload = {
  commit_sha: string;
  build_time_utc: string;
  environment: string;
};

const SHOW_BUILD_BADGE = process.env.NEXT_PUBLIC_SHOW_BUILD_BADGE === "1";
// Mesma ordem de NAV_GROUPS_CONFIG (lib/navConfig.ts) — define a prioridade do
// warm-up ocioso, então segue a ordem em que os destinos aparecem no menu.
const PRIMARY_NAV_ROUTES = ["/hoje", "/banco", "/cards", "/evolucao"];

type IdleCallbackHandle = number;
type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => IdleCallbackHandle;
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
};

function scheduleIdleNavigationWarmup(task: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const win = window as WindowWithIdleCallback;
  if (typeof win.requestIdleCallback === "function") {
    const handle = win.requestIdleCallback(task, { timeout: 1200 });
    return () => win.cancelIdleCallback?.(handle);
  }
  const timeoutId = window.setTimeout(task, 550);
  return () => window.clearTimeout(timeoutId);
}

function shouldHideNavigationChrome(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    // Superficies PUBLICAS da Facies. Sem estas duas linhas, a pagina que o
    // visitante anonimo abre pelo link do grupo aparece com a barra lateral do
    // app autenticado do lado — chrome de um produto que ele ainda nao tem.
    pathname.startsWith("/facies") ||
    pathname.startsWith("/prova") ||
    pathname === ACTIVATE_ROUTE ||
    // Immersive question/simulado runner: hide the full chrome (desktop sidebar
    // included). The session page keeps its own visible "Sair" affordance.
    pathname.startsWith("/banco/sessao") ||
    isStudyImportImmersivePath(pathname)
  );
}

function fallbackTitle(pathname: string): string {
  if (pathname.startsWith("/admin")) return "Admin";
  return getStudentPageTitle(pathname);
}

function shouldShowMobileTopBar(pathname: string, hideChrome: boolean): boolean {
  if (hideChrome) return false;
  if (pathname.startsWith("/banco/sessao")) return false;
  return true;
}


/**
 * Barra de titulo do mobile.
 *
 * O hamburguer saiu — a navegacao agora e a barra inferior de abas. A barra de
 * TOPO fica: `CronogramaMonthView` monta o seletor de mes como `title` (um
 * ReactNode, nao string) e `banco/page.tsx` monta acoes aqui. Removendo ela
 * junto, essas duas telas perderiam controles reais.
 *
 * Titulo em maiuscula por CSS, nunca na string: `text-transform` mantem o texto
 * acentuado intacto no DOM (e o checker de copy pt-BR passa).
 */
function MobileTopBar({ pathname }: { pathname: string }) {
  const { title, actions } = useContext(NavbarContext);
  const displayTitle = title ?? fallbackTitle(pathname);
  return (
    <header
      className="fixed inset-x-0 top-0 z-30 flex h-12 items-center border-b border-edge bg-surfaceMuted px-3 md:hidden"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)", height: "calc(3rem + env(safe-area-inset-top, 0px))" }}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-14">
        {typeof displayTitle === "string" ? (
          <span className="paper-eyebrow truncate text-ink">
            {displayTitle}
          </span>
        ) : (
          <div className="pointer-events-auto">{displayTitle}</div>
        )}
      </div>
      <div className="relative z-10 ml-auto flex shrink-0 items-center gap-0.5">
        {actions ?? <span className="w-8" aria-hidden="true" />}
      </div>
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
      className="paper-eyebrow pointer-events-none fixed right-2 z-[60] rounded-control border border-edge bg-paper px-1.5 py-0.5 bottom-[calc(env(safe-area-inset-bottom,0px)+0.8rem)] md:bottom-3"
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
  const [sessionExpiredOpen, setSessionExpiredOpen] = useState(false);
  const showMobileTopBar = !isDesktopNavigation && shouldShowMobileTopBar(pathname, hideNavigationChrome);
  // A barra de abas segue a mesma regra do topo: some no modo imersivo (sessao
  // de questoes, runner de importacao). Tocar numa aba durante a revisao de
  // cards dispararia o guard de `popstate` do Turbo.
  const showMobileTabBar = showMobileTopBar;
  // Altura real da navegacao inferior, publicada em `--nav-stack-height` para
  // quem precisa se afastar do rodape — hoje o `<main>` e o `BottomActionBar`.
  //
  // A aritmetica morava aqui em tres strings soltas, e o `BottomActionBar` nao
  // participava dela: ficava em `bottom-0` e a barra de abas pintava por cima.
  // Um token so resolve a colisao e mata a dupla contagem de safe-area (a barra
  // de abas ja a consome no proprio `padding-bottom`).
  //
  // 3.875rem = `min-h-[3.875rem]` da fileira de abas; 2.75rem = a linha de
  // filhos (`min-h-10` + `pb-1`).
  const navStackHeight = !showMobileTabBar
    ? "0px"
    : hasChildRow(pathname)
      ? "calc(3.875rem + 2.75rem + env(safe-area-inset-bottom, 0px))"
      : "calc(3.875rem + env(safe-area-inset-bottom, 0px))";
  const mobileBottomPad = !showMobileTabBar
    ? "pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]"
    : "pb-[calc(var(--nav-stack-height)+1.25rem)]";
  // Altura LIVRE entre as duas barras, ja descontado o respiro do proprio
  // `<main>`. Publicada pelo mesmo motivo que `--nav-stack-height`: quem precisa
  // preencher a tela estava adivinhando o valor. A revisao de cards usava
  // `calc(100svh - 5.5rem)` — um numero magico que ignorava a linha de filhos e
  // a safe-area, e por isso empurrava os botoes de avaliacao para baixo da barra
  // de abas, onde o dedo nao alcanca.
  //
  // A aritmetica mora aqui porque e aqui que o recuo do `<main>` e decidido:
  // repetida na ponta, ela envelhece na primeira vez que este arquivo mudar.
  const contentFreeHeight = hideNavigationChrome
    ? "100svh"
    : isDesktopNavigation
      ? "calc(100svh - max(1.5rem, env(safe-area-inset-top, 0px)) - 2rem)"
      : showMobileTopBar
        ? "calc(100svh - env(safe-area-inset-top, 0px) - 5rem - var(--nav-stack-height))"
        : "calc(100svh - max(1.5rem, env(safe-area-inset-top, 0px)) - 1.25rem - var(--nav-stack-height))";
  const mainClassName = hideNavigationChrome
    ? "min-h-screen"
    : isDesktopNavigation
      ? "max-w-lg md:max-w-5xl lg:max-w-6xl mx-auto px-4 md:px-6 pt-[max(1.5rem,env(safe-area-inset-top,0px))] pb-[calc(env(safe-area-inset-bottom,0px)+0.85rem)] md:pb-8"
      : showMobileTopBar
        ? `max-w-lg mx-auto px-4 pt-[calc(env(safe-area-inset-top,0px)+3.75rem)] ${mobileBottomPad}`
        : `max-w-lg mx-auto px-4 pt-[max(1.5rem,env(safe-area-inset-top,0px))] ${mobileBottomPad}`;

  useEffect(() => {
    if (pathname === INITIAL_GOAL_SETUP_ROUTE) {
      blockedNavigationPathRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    return subscribeSessionExpired(() => {
      if (isSessionExpirationSuppressedPath(window.location.pathname)) return;
      if (window.location.pathname === ACTIVATE_ROUTE) return;
      setSessionExpiredOpen(true);
    });
  }, []);

  // Renova a sessão antes do vencimento enquanto o aluno está no app, para que o
  // access token não expire no meio de uma ação.
  useEffect(() => startSessionKeepalive(), []);

  function redirectToExpiredLogin() {
    acknowledgeSessionExpired();
    setSessionExpiredOpen(false);
    if (startSessionExpiredRedirect()) {
      router.replace(SESSION_EXPIRED_LOGIN_URL);
    }
  }

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

  useEffect(() => {
    if (hideNavigationChrome || pathname.startsWith("/banco/sessao")) return;
    const token = getAuthToken();
    return scheduleIdleNavigationWarmup(() => {
      for (const href of PRIMARY_NAV_ROUTES) {
        warmRoute(href, router);
        if (href !== pathname) warmRouteData(href, token);
      }
    });
  }, [hideNavigationChrome, pathname, router]);

  return (
    <>
      <PwaRegister />
      <SidebarNav isDesktopNavigation={isDesktopNavigation} displayName={userDisplayName} photoUrl={userPhotoUrl} />
      {showMobileTopBar && <MobileTopBar pathname={pathname} />}
      {/* O token vive aqui e nao no fragmento: cobre o `<main>` e, com ele, todo
          `BottomActionBar` que as paginas montam dentro. A barra de abas nao le
          o token — ela DEFINE a altura que ele descreve. */}
      <div
        className={hideNavigationChrome || !isDesktopNavigation ? "" : "ml-14"}
        style={
          {
            "--nav-stack-height": navStackHeight,
            "--app-content-height": contentFreeHeight,
          } as CSSProperties
        }
      >
        <main className={mainClassName}>
          <Nav />
          {/* A linha de filhos so aparece no desktop: no mobile ela mora colada
              na barra inferior, onde o polegar alcanca. */}
          {!hideNavigationChrome && isDesktopNavigation && <IntentSubNav />}
          {/* O nome ja foi buscado aqui para a sidebar; o provider so o torna
              alcancavel pelas paginas, sem uma segunda ida a rede. */}
          <ProfileDisplayNameProvider displayName={userDisplayName}>
            {children}
          </ProfileDisplayNameProvider>
        </main>
      </div>
      {showMobileTabBar && <MobileTabBar />}
      {/* Acelerador de teclado, e só. Fica fora das telas sem chrome (login,
          sessão imersiva) pela mesma razão que o menu fica: lá o aluno tem uma
          tarefa só, e navegar para outro lugar não é ela. */}
      {!hideNavigationChrome && <CommandBar />}
      <Toast />
      <BuildVersionBadge />
      <ConfirmDialog
        open={sessionExpiredOpen && !isSessionExpirationSuppressedPath(pathname) && pathname !== ACTIVATE_ROUTE}
        title="Sessão expirada"
        message="Entre novamente para continuar."
        cancelLabel="Fechar"
        confirmLabel="Entrar novamente"
        onCancel={redirectToExpiredLogin}
        onConfirm={redirectToExpiredLogin}
        zIndexClassName="z-[80]"
      />
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <QueryProvider>
        <ToastProvider>
          <NavbarProvider>
            <StudentExperienceProvider>
              <AppShellInner>{children}</AppShellInner>
            </StudentExperienceProvider>
          </NavbarProvider>
        </ToastProvider>
      </QueryProvider>
    </MotionConfig>
  );
}
