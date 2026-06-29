import { createHmac, timingSafeEqual } from "crypto";

const MAX_AGE_MS = 2 * 60 * 1000;

function getSecret(): string | null {
  return process.env.AUTH_SECRET?.trim() ?? null;
}

function signPayload(userId: string, email: string, expiresAt: number): string | null {
  const secret = getSecret();
  if (!secret) return null;

  const payload = `${userId}:${email.toLowerCase()}:${expiresAt}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

function parseSignedValue(
  token: string
): { userId: string; email: string; expiresAt: number } | null {
  const secret = getSecret();
  if (!secret) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  const parts = payload.split(":");
  if (parts.length < 3) return null;

  const expiresAt = Number(parts[parts.length - 1]);
  const email = parts[parts.length - 2];
  const userId = parts.slice(0, -2).join(":");

  if (!userId || !email || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return null;
  }

  return { userId, email, expiresAt };
}

/** Short-lived proof that initiateLogin already verified password + Turnstile. */
export function createPreAuthToken(userId: string, email: string): string | null {
  const expiresAt = Date.now() + MAX_AGE_MS;
  return signPayload(userId, email.trim().toLowerCase(), expiresAt);
}

export function verifyPreAuthToken(
  token: string,
  email: string,
  userId: string
): boolean {
  const parsed = parseSignedValue(token);
  return (
    parsed?.userId === userId &&
    parsed.email === email.trim().toLowerCase()
  );
}
