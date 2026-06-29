"use server";

import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendTwoFactorOtpEmail } from "@/lib/email";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { createTurnstilePassToken } from "@/lib/turnstile-pass";
import { userRequiresTwoFactor } from "@/lib/auth-utils";
import {
  createTwoFactorPassToken,
  setTwoFactorPassCookie,
} from "@/lib/two-factor-cookie";
import { createPendingLoginToken, consumePendingLoginToken, peekPendingLoginToken } from "@/lib/pending-login";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const OTP_LOCK_MS = 15 * 60 * 1000;

export type InitiateLoginResult =
  | { success: true; requires2FA: false; turnstilePass: string | null }
  | {
      success: true;
      requires2FA: true;
      email: string;
      pendingLoginToken: string;
      turnstilePass: string | null;
      devOtp?: string;
    }
  | { success: false; error: string };

export async function initiateLogin(
  email: string,
  password: string,
  turnstileToken: string | null | undefined
): Promise<InitiateLoginResult> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !password) {
    return { success: false, error: "Invalid credentials" };
  }

  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const remoteIp =
    forwardedFor?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? undefined;

  const turnstileOk = await verifyTurnstileToken(turnstileToken, remoteIp);
  if (!turnstileOk) {
    return { success: false, error: "Turnstile verification failed" };
  }

  const turnstilePass = createTurnstilePassToken(trimmedEmail);

  const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
  if (!user || !user.isActive) {
    return { success: false, error: "Invalid credentials" };
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    return { success: false, error: "Invalid credentials" };
  }

  if (!userRequiresTwoFactor(user)) {
    return { success: true, requires2FA: false, turnstilePass };
  }

  if (user.otpLockedUntil && user.otpLockedUntil > new Date()) {
    return { success: false, error: "Too many attempts. Try again later." };
  }

  const otp = String(randomInt(100000, 999999));
  const otpHash = await bcrypt.hash(otp, 10);
  const otpExpiry = new Date(Date.now() + OTP_TTL_MS);

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
      const pendingLoginToken = createPendingLoginToken(trimmedEmail, password);
      if (!pendingLoginToken) {
        return {
          success: false,
          error: "Server auth is misconfigured (AUTH_SECRET). Restart the dev server after updating .env.",
        };
      }
      return {
        success: true,
        requires2FA: true,
        email: user.email,
        pendingLoginToken,
        turnstilePass,
        devOtp: otp,
      };
    }
    return { success: false, error: emailResult.message };
  }

  const pendingLoginToken = createPendingLoginToken(trimmedEmail, password);
  if (!pendingLoginToken) {
    return {
      success: false,
      error: "Server auth is misconfigured (AUTH_SECRET). Restart the dev server after updating .env.",
    };
  }

  return {
    success: true,
    requires2FA: true,
    email: user.email,
    pendingLoginToken,
    turnstilePass,
    ...(process.env.NODE_ENV === "development" ? { devOtp: otp } : {}),
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
      attempts >= MAX_OTP_ATTEMPTS ? new Date(Date.now() + OTP_LOCK_MS) : null;
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
