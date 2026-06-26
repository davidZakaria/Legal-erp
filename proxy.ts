import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { Role } from "@prisma/client";
import { routing } from "./i18n/routing";
import { canViewAuditLogs, canAccessAdminSection } from "@/lib/rbac";

const intlMiddleware = createMiddleware(routing);

const publicPaths = ["/login", "/2fa", "/setup-password"];

type AuthToken = {
  id?: string;
  role?: Role;
  requiresPasswordChange?: boolean;
};

function getPathWithoutLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && routing.locales.includes(segments[0] as "ar" | "en")) {
    return "/" + segments.slice(1).join("/");
  }
  return pathname;
}

async function getSessionUser(request: NextRequest) {
  const token = (await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  })) as AuthToken | null;

  if (!token?.id || !token.role) {
    return null;
  }

  return {
    id: token.id,
    role: token.role,
    requiresPasswordChange: Boolean(token.requiresPasswordChange),
  };
}

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const pathWithoutLocale = getPathWithoutLocale(pathname);
  const locale = pathname.split("/")[1] || routing.defaultLocale;

  const isPublicPath = publicPaths.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(p + "/")
  );

  if (isPublicPath) {
    const user = await getSessionUser(request);

    if (pathWithoutLocale === "/setup-password" && user) {
      if (!user.requiresPasswordChange) {
        return NextResponse.redirect(new URL(`/${locale}`, request.url));
      }
      return intlMiddleware(request);
    }

    if (
      user &&
      user.requiresPasswordChange &&
      (pathWithoutLocale === "/login" || pathWithoutLocale === "/2fa")
    ) {
      return NextResponse.redirect(new URL(`/${locale}/setup-password`, request.url));
    }

    return intlMiddleware(request);
  }

  const user = await getSessionUser(request);

  if (!user) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user.requiresPasswordChange) {
    return NextResponse.redirect(new URL(`/${locale}/setup-password`, request.url));
  }

  if (pathWithoutLocale.startsWith("/audit-logs")) {
    if (!canViewAuditLogs(user.role)) {
      return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }
  }

  if (pathWithoutLocale.startsWith("/admin/security")) {
    if (user.role !== Role.SUPER_ADMIN) {
      return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }
  }

  if (pathWithoutLocale.startsWith("/admin")) {
    if (!canAccessAdminSection(user.role)) {
      return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
