import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "njd-turnstile-pass";
const MAX_AGE_SECONDS = 5 * 60;

function getSecret(): string | null {
  return process.env.AUTH_SECRET?.trim() ?? null;
}

function signPayload(email: string, expiresAt: number): string | null {
  const secret = getSecret();
  if (!secret) return null;

  const payload = `${email.toLowerCase()}:${expiresAt}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

function verifySignedValue(value: string): { email: string; expiresAt: number } | null {
  const secret = getSecret();
  if (!secret) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  const colonIndex = payload.lastIndexOf(":");
  if (colonIndex <= 0) return null;

  const tokenEmail = payload.slice(0, colonIndex);
  const expiresAt = Number(payload.slice(colonIndex + 1));
  if (!tokenEmail || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return null;
  }

  return { email: tokenEmail, expiresAt };
}

/** Issued after a successful Turnstile check so the token is not verified twice. */
export function createTurnstilePassToken(email: string): string | null {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  return signPayload(email.trim().toLowerCase(), expiresAt);
}

export function verifyTurnstilePassToken(token: string, email: string): boolean {
  const parsed = verifySignedValue(token);
  return parsed?.email === email.trim().toLowerCase();
}

export async function setTurnstilePassCookie(email: string): Promise<boolean> {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const value = signPayload(email.trim().toLowerCase(), expiresAt);
  if (!value) return false;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return true;
}

export async function hasValidTurnstilePassCookie(email: string): Promise<boolean> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return false;
  const parsed = verifySignedValue(raw);
  return parsed?.email === email.trim().toLowerCase();
}

export async function clearTurnstilePassCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function consumeTurnstilePassCookie(email: string): Promise<boolean> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return false;

  const parsed = verifySignedValue(raw);
  cookieStore.delete(COOKIE_NAME);

  return parsed?.email === email.trim().toLowerCase();
}
