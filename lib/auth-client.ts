"use client";

import { getSession, signIn } from "next-auth/react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export async function completeSignIn(options: {
  email: string;
  password: string;
  turnstileToken?: string | null;
  twoFactorPass?: string;
  router: AppRouterInstance;
}): Promise<{ success: boolean; error?: string }> {
  const result = await signIn("credentials", {
    email: options.email.trim().toLowerCase(),
    password: options.password,
    turnstileToken: options.turnstileToken ?? "",
    twoFactorPass: options.twoFactorPass ?? "",
    redirect: false,
  });

  if (!result || result.error || !result.ok) {
    return { success: false, error: "loginError" };
  }

  const session = await getSession();
  if (session?.user?.requiresPasswordChange) {
    options.router.push("/setup-password");
    options.router.refresh();
    return { success: true };
  }

  options.router.push("/");
  options.router.refresh();
  return { success: true };
}
