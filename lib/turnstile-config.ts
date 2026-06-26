/** Cloudflare Turnstile test keys — visible widget, always passes verification in dev. */
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

export function getTurnstileSiteKey(): string | null {
  const configured = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "development") return TURNSTILE_TEST_SITE_KEY;
  return null;
}

export function getTurnstileSecretKey(): string | null {
  const configured = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "development") return TURNSTILE_TEST_SECRET_KEY;
  return null;
}

export function isTurnstileConfigured(): boolean {
  return Boolean(getTurnstileSiteKey() && getTurnstileSecretKey());
}
