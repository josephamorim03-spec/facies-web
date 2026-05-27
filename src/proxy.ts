import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/auth", "/api/", "/_next/", "/__nextjs"];
const PUBLIC_FILE_REGEX = /\.[^/]+$/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_FILE_REGEX.test(pathname)) {
    return NextResponse.next();
  }

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("agendar_session")?.value?.trim() || "";
  if (!sessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.ico|.*\\.webmanifest).*)"],
};
