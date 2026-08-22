import { NextRequest, NextResponse } from "next/server";

// `/facies` e as paginas por banca sao publicas de proposito: elas servem
// agregado estatico (formato do item, contagem por assunto, media nacional) e
// nao tocam dado de aluno, sessao nem questao individual. Sao o funil -- exigir
// login antes delas seria o gate ANTES do valor, que e o erro que o
// posicionamento inteiro evita.
// A barra final NAO e decorativa: sem ela, "/prova" casa "/provas", que e rota
// autenticada. Mesma armadilha que o comentario de PUBLIC_EXACT descreve, um
// nivel abaixo. Quem for adicionar prefixo aqui: termine em "/" e adicione o
// caminho exato ao lado, senao "/facies" (sem filho) deixa de abrir.
const PUBLIC_PREFIXES = ["/login", "/auth/", "/api/", "/_next/", "/__nextjs", "/facies/", "/prova/"];

// `/` e EXATO, nunca prefixo. Todo caminho comeca com "/", entao "/" dentro de
// PUBLIC_PREFIXES abriria o app inteiro sem que a linha parecesse errada.
const PUBLIC_EXACT = new Set(["/", "/facies", "/auth", "/enamed"]);

const PUBLIC_FILE_REGEX = /\.[^/]+$/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_FILE_REGEX.test(pathname)) {
    return NextResponse.next();
  }

  if (PUBLIC_EXACT.has(pathname)) {
    return NextResponse.next();
  }

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.ico|.*\\.webmanifest).*)"],
};
