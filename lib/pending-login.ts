import { createHmac, timingSafeEqual } from "crypto";

const PENDING_LOGIN_TTL_MS = 10 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return secret;
}

export function isPendingLoginConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET?.trim());
}

function signPayload(payloadB64: string): string | null {
  try {
    return createHmac("sha256", getSecret()).update(payloadB64).digest("hex");
  } catch {
    return null;
  }
}

export function createPendingLoginToken(email: string, password: string): string | null {
  if (!isPendingLoginConfigured()) {
    console.error("[pending-login] AUTH_SECRET is not configured");
    return null;
  }

  const expiresAt = Date.now() + PENDING_LOGIN_TTL_MS;
  const payloadB64 = Buffer.from(
    JSON.stringify({ email: email.trim().toLowerCase(), password, expiresAt })
  ).toString("base64url");
  const signature = signPayload(payloadB64);
  if (!signature) {
    return null;
  }
  return `${payloadB64}.${signature}`;
}

export function peekPendingLoginToken(
  token: string
): { email: string; password: string } | null {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) {
    return null;
  }

  const expected = signPayload(payloadB64);
  if (!expected) {
    return null;
  }

  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
      email?: string;
      password?: string;
      expiresAt?: number;
    };
    if (
      !parsed.email ||
      !parsed.password ||
      !parsed.expiresAt ||
      parsed.expiresAt < Date.now()
    ) {
      return null;
    }
    return { email: parsed.email, password: parsed.password };
  } catch {
    return null;
  }
}

export function consumePendingLoginToken(
  token: string
): { email: string; password: string } | null {
  return peekPendingLoginToken(token);
}
