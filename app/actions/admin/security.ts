"use server";

import { Role } from "@prisma/client";
import { requireAuthenticatedSession } from "@/lib/auth-guards";
import {
  getTurnstileSiteKey,
  isTurnstileConfigured,
} from "@/lib/turnstile-config";

async function assertSuperAdmin() {
  const gate = await requireAuthenticatedSession();
  if (!gate.success || gate.session.user.role !== Role.SUPER_ADMIN) {
    return null;
  }
  return gate.session;
}

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export async function getSecurityPageData() {
  const session = await assertSuperAdmin();
  if (!session) {
    return null;
  }

  const siteKey = getTurnstileSiteKey();
  const hasProductionKeys = Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() &&
      process.env.TURNSTILE_SECRET_KEY?.trim()
  );
  const isDevelopment = process.env.NODE_ENV === "development";

  return {
    turnstile: {
      isConfigured: isTurnstileConfigured(),
      hasProductionKeys,
      isUsingDevKeys: isDevelopment && !hasProductionKeys,
      siteKeyPreview: siteKey ? maskKey(siteKey) : null,
    },
  };
}
