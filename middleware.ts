import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { auth } from "@/lib/auth";
import { canViewAuditLogs } from "@/lib/rbac";
import { Role } from "@prisma/client";

const intlMiddleware = createMiddleware(routing);

const publicPaths = ["/login"];

function getPathWithoutLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && routing.locales.includes(segments[0] as "ar" | "en")) {
    return "/" + segments.slice(1).join("/");
  }
  return pathname;
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const pathWithoutLocale = getPathWithoutLocale(pathname);

  if (publicPaths.some((p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(p + "/"))) {
    return intlMiddleware(request);
  }

  const session = await auth();

  if (!session?.user) {
    const locale = pathname.split("/")[1] || routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathWithoutLocale.startsWith("/audit-logs")) {
    const role = session.user.role as Role;
    if (!canViewAuditLogs(role)) {
      const locale = pathname.split("/")[1] || routing.defaultLocale;
      return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
