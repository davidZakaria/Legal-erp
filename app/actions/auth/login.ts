"use server";

import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendTwoFactorOtpEmail } from "@/lib/email";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { setTurnstilePassCookie, clearTurnstilePassCookie } from "@/lib/turnstile-pass";
import { userRequiresTwoFactor } from "@/lib/auth-utils";
import {
  createTwoFactorPassToken,
  setTwoFactorPassCookie,
} from "@/lib/two-factor-cookie";
import { createPendingLoginToken, consumePendingLoginToken, peekPendingLoginToken } from "@/lib/pending-login";

import {
  OTP_VALIDITY_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
  OTP_LOCKOUT_MS,
} from "@/lib/two-factor-config";

async function issueAndEmailOtp(user: {
  id: string;
  email: string;
  name: string;
  secondaryEmail: string | null;
}): Promise<{ success: true; otp: string } | { success: false; error: string }> {
  const otp = String(randomInt(100000, 999999));
  const otpHash = await bcrypt.hash(otp, 10);
  const otpExpiry = new Date(Date.now() + OTP_VALIDITY_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      otpCode: otpHash,
      otpExpiry,
      otpAttempts: 0,
      otpLockedUntil: null,
    },
  });

  if (process.env.NODE_ENV === "development") {
    console.log(`[dev 2FA] OTP for ${user.email}: ${otp}`);
  }

  const emailResult = await sendTwoFactorOtpEmail({
    to: user.email,
    secondaryEmail: user.secondaryEmail,
    otp,
    userName: user.name,
  });

  if (!emailResult.success) {
    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: null, otpExpiry: null },
    });
    if (process.env.NODE_ENV === "development") {
      console.warn("[dev 2FA] Email delivery failed — use the OTP printed above.");
      return { success: true, otp };
    }
    return { success: false, error: emailResult.message };
  }

  return { success: true, otp };
}

export type InitiateLoginResult =
  | { success: true; requires2FA: false }
  | {
      success: true;
      requires2FA: true;
      email: string;
      pendingLoginToken: string;
      devOtp?: string;
    }
  | { success: false; error: string; resetTurnstile?: boolean };

export async function initiateLogin(
  email: string,
  password: string,
  turnstileToken: string | null | undefined
): Promise<InitiateLoginResult> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !password) {
    return { success: false, error: "Invalid credentials" };
  }

  const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
  if (!user) {
    return { success: false, error: "Invalid credentials" };
  }

  if (!user.isActive) {
    return { success: false, error: "Account is deactivated" };
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    return { success: false, error: "Invalid credentials" };
  }

  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const remoteIp =
    forwardedFor?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? undefined;

  const turnstileOk = await verifyTurnstileToken(turnstileToken, remoteIp);
  if (!turnstileOk) {
    return {
      success: false,
      error: "Turnstile verification failed",
      resetTurnstile: true,
    };
  }

  const turnstileCookieSet = await setTurnstilePassCookie(trimmedEmail);
  if (!turnstileCookieSet) {
    console.error("[Turnstile] Could not set pass cookie — check AUTH_SECRET");
    return { success: false, error: "Server auth misconfigured", resetTurnstile: true };
  }

  const failAfterTurnstile = async (
    error: string,
    resetTurnstile = false
  ): Promise<Extract<InitiateLoginResult, { success: false }>> => {
    await clearTurnstilePassCookie();
    return { success: false, error, resetTurnstile };
  };

  if (!userRequiresTwoFactor(user)) {
    return { success: true, requires2FA: false };
  }

  if (user.otpLockedUntil && user.otpLockedUntil > new Date()) {
    return failAfterTurnstile("Too many attempts. Try again later.", true);
  }

  const otpResult = await issueAndEmailOtp(user);
  if (!otpResult.success) {
    return failAfterTurnstile(otpResult.error, true);
  }

  const pendingLoginToken = createPendingLoginToken(trimmedEmail, password);
  if (!pendingLoginToken) {
    return failAfterTurnstile(
      "Server auth is misconfigured (AUTH_SECRET). Restart the dev server after updating .env.",
      true
    );
  }

  return {
    success: true,
    requires2FA: true,
    email: user.email,
    pendingLoginToken,
    ...(process.env.NODE_ENV === "development" ? { devOtp: otpResult.otp } : {}),
  };
}

export async function resendOTP(
  email: string,
  pendingLoginToken: string
): Promise<{
  success: boolean;
  error?: string;
  devOtp?: string;
  retryAfterSeconds?: number;
}> {
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail || !pendingLoginToken) {
    return { success: false, error: "Login session expired. Please sign in again." };
  }

  const pending = peekPendingLoginToken(pendingLoginToken);
  if (!pending || pending.email !== trimmedEmail) {
    return { success: false, error: "Login session expired. Please sign in again." };
  }

  const user = await prisma.user.findUnique({
    where: { email: trimmedEmail },
    select: {
      id: true,
      email: true,
      name: true,
      secondaryEmail: true,
      isActive: true,
      role: true,
      isTwoFactorEnabled: true,
      otpExpiry: true,
      otpLockedUntil: true,
    },
  });

  if (!user || !user.isActive || !userRequiresTwoFactor(user)) {
    return { success: false, error: "Login session expired. Please sign in again." };
  }

  if (user.otpLockedUntil && user.otpLockedUntil > new Date()) {
    return { success: false, error: "Too many attempts. Try again later." };
  }

  if (user.otpExpiry) {
    const sentAt = user.otpExpiry.getTime() - OTP_VALIDITY_MS;
    const elapsed = Date.now() - sentAt;
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      return {
        success: false,
        error: "Please wait before requesting a new code.",
        retryAfterSeconds: Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000),
      };
    }
  }

  const otpResult = await issueAndEmailOtp(user);
  if (!otpResult.success) {
    return { success: false, error: otpResult.error };
  }

  return {
    success: true,
    ...(process.env.NODE_ENV === "development" ? { devOtp: otpResult.otp } : {}),
  };
}

export async function verifyOTP(
  email: string,
  code: string,
  pendingLoginToken?: string | null
): Promise<{ success: boolean; error?: string; passToken?: string }> {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedCode = code.trim();

  if (!trimmedEmail || !/^\d{6}$/.test(trimmedCode)) {
    return { success: false, error: "Invalid verification code" };
  }

  if (pendingLoginToken) {
    const pending = peekPendingLoginToken(pendingLoginToken);
    if (!pending || pending.email !== trimmedEmail) {
      return { success: false, error: "Login session expired. Please sign in again." };
    }
  }

  const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
  if (!user || !user.isActive) {
    return { success: false, error: "Invalid verification code" };
  }

  if (!userRequiresTwoFactor(user)) {
    return { success: false, error: "Two-factor authentication is not required" };
  }

  if (user.otpLockedUntil && user.otpLockedUntil > new Date()) {
    return { success: false, error: "Too many attempts. Try again later." };
  }

  if (!user.otpCode || !user.otpExpiry || user.otpExpiry < new Date()) {
    return { success: false, error: "Verification code expired" };
  }

  const otpValid = await bcrypt.compare(trimmedCode, user.otpCode);
  if (!otpValid) {
    const attempts = user.otpAttempts + 1;
    const lockUntil =
      attempts >= OTP_MAX_ATTEMPTS ? new Date(Date.now() + OTP_LOCKOUT_MS) : null;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpAttempts: attempts,
        otpLockedUntil: lockUntil,
        ...(lockUntil ? { otpCode: null, otpExpiry: null } : {}),
      },
    });
    return { success: false, error: "Invalid verification code" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      otpCode: null,
      otpExpiry: null,
      otpAttempts: 0,
      otpLockedUntil: null,
    },
  });

  await setTwoFactorPassCookie(user.id);
  const passToken = createTwoFactorPassToken(user.id);

  return { success: true, passToken };
}

export async function resolvePendingLoginCredentials(
  pendingLoginToken: string
): Promise<{ email: string; password: string } | null> {
  return consumePendingLoginToken(pendingLoginToken);
}

export async function userNeedsTwoFactorByEmail(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { role: true, isTwoFactorEnabled: true },
  });
  if (!user) return false;
  return userRequiresTwoFactor(user);
}
