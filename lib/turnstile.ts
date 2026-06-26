import { getTurnstileSecretKey, isTurnstileConfigured } from "@/lib/turnstile-config";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export { isTurnstileConfigured } from "@/lib/turnstile-config";

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<boolean> {
  if (!isTurnstileConfigured()) {
    if (process.env.NODE_ENV === "development") {
      return true;
    }
    console.error("[Turnstile] Keys missing — verification required but not configured");
    return false;
  }

  if (!token?.trim()) {
    return false;
  }

  const body = new URLSearchParams({
    secret: getTurnstileSecretKey()!,
    response: token.trim(),
  });

  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error("[Turnstile] Verification request failed:", error);
    return false;
  }
}
