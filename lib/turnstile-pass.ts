import { createHmac, timingSafeEqual } from "crypto";

const MAX_AGE_MS = 5 * 60 * 1000;

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

/** Issued after a successful Turnstile check so the token is not verified twice. */
export function createTurnstilePassToken(email: string): string | null {
  const expiresAt = Date.now() + MAX_AGE_MS;
  return signPayload(email.trim().toLowerCase(), expiresAt);
}

export function verifyTurnstilePassToken(token: string, email: string): boolean {
  const secret = getSecret();
  if (!secret) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }

  const [tokenEmail, expiresAtRaw] = payload.split(":");
  const expiresAt = Number(expiresAtRaw);
  if (!tokenEmail || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return false;
  }

  return tokenEmail === email.trim().toLowerCase();
}
