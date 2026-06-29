import { encode } from "@auth/core/jwt";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function getSessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

export type SessionUserPayload = {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: string[];
  requiresPasswordChange: boolean;
};

/** Set the Auth.js session cookie after credentials were verified elsewhere. */
export async function establishUserSession(user: SessionUserPayload): Promise<void> {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }

  const cookieName = getSessionCookieName();
  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions ?? [],
      requiresPasswordChange: user.requiresPasswordChange ?? false,
    },
    secret,
    salt: cookieName,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}
