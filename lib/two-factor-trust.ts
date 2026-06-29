import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import { getTwoFactorTrustSeconds } from "@/lib/two-factor-config";

const COOKIE_NAME = "njd-2fa-trust";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return secret;
}

function signPayload(userId: string, expiresAt: number): string {
  const payload = `${userId}:${expiresAt}`;
  const signature = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

function verifySignedValue(value: string): { userId: string; expiresAt: number } | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", getSecret()).update(payload).digest("hex");
  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  const [userId, expiresAtRaw] = payload.split(":");
  const expiresAt = Number(expiresAtRaw);
  if (!userId || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return null;
  }

  return { userId, expiresAt };
}

/** Remember this browser so email OTP is not required again until expiry. */
export async function setTrustedDeviceCookie(userId: string): Promise<void> {
  const maxAgeSeconds = getTwoFactorTrustSeconds();
  if (maxAgeSeconds <= 0) {
    return;
  }

  const expiresAt = Date.now() + maxAgeSeconds * 1000;
  const value = signPayload(userId, expiresAt);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function hasValidTrustedDeviceCookie(userId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) {
    return false;
  }
  const parsed = verifySignedValue(raw);
  return parsed?.userId === userId;
}

export async function clearTrustedDeviceCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
