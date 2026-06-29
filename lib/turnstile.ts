import { getTurnstileSecretKey, isTurnstileConfigured } from "@/lib/turnstile-config";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export { isTurnstileConfigured } from "@/lib/turnstile-config";

type SiteVerifyResponse = {
  success?: boolean;
  "error-codes"?: string[];
};

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
    console.error("[Turnstile] Missing token in request");
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
      console.error("[Turnstile] siteverify HTTP error:", response.status);
      return false;
    }

    const data = (await response.json()) as SiteVerifyResponse;
    if (data.success === true) {
      return true;
    }

    console.error("[Turnstile] siteverify rejected token:", data["error-codes"]?.join(", ") ?? "unknown");
    return false;
  } catch (error) {
    console.error("[Turnstile] Verification request failed:", error);
    return false;
  }
}
