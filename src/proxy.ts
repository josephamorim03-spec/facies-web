import { NextRequest, NextResponse } from "next/server";

import { rotaEhPublica } from "@/lib/rotasPublicas";

/**
 * Guard de borda: quem não tem sessão só enxerga o funil público.
 *
 * A lista de rotas públicas — e o raciocínio de cada linha dela — vive em
 * `@/lib/rotasPublicas`, separada daqui para poder ser exercitada sem subir
 * Next. Ver `tests/unit/proxy-public-routes.test.mjs`: é fronteira de segurança
 * numa direção e de funil na outra, e as duas já custaram caro.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (rotaEhPublica(pathname)) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("krosmed_session")?.value?.trim() || "";
  const refreshHint = request.cookies.get("krosmed_refresh_hint")?.value?.trim() || "";
  if (!sessionToken && !refreshHint) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const nextPath = `${pathname}${request.nextUrl.search}`;
    url.search = "";
    if (nextPath && nextPath !== "/") {
      url.searchParams.set("next", nextPath);
    }
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/agenda-operacional/importar") || pathname.startsWith("/cronograma/importar")) {
    const url = request.nextUrl.clone();
    url.pathname = "/banco";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // `_next/webpack-hmr` entra na exclusão: é o WebSocket do hot reload, e o
  // guard interceptava o upgrade e devolvia resposta HTTP inválida
  // (`net::ERR_INVALID_HTTP_RESPONSE`, medido no console em 2026-09-10). Só
  // existe em `next dev` — em produção não há HMR, então a exclusão não abre
  // nada. Os outros dois `_next` já estavam aqui pelo mesmo motivo: asset de
  // build não passa por decisão de sessão.
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.svg|.*\\.ico|.*\\.webmanifest).*)",
  ],
};
