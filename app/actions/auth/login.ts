"use server";

import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendTwoFactorOtpEmail } from "@/lib/email";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { userRequiresTwoFactor } from "@/lib/auth-utils";
import { setTwoFactorPassCookie } from "@/lib/two-factor-cookie";

const OTP_TTL_MS = 10 * 60 * 1000;

export type InitiateLoginResult =
  | { success: true; requires2FA: false }
  | { success: true; requires2FA: true; email: string }
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

  const turnstileOk = await verifyTurnstileToken(turnstileToken);
  if (!turnstileOk) {
    return { success: false, error: "Turnstile verification failed" };
  }

  const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
  if (!user || !user.isActive) {
    return { success: false, error: "Invalid credentials" };
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    return { success: false, error: "Invalid credentials" };
  }

  if (!userRequiresTwoFactor(user)) {
    return { success: true, requires2FA: false };
  }

  const otp = String(randomInt(100000, 999999));
  const otpExpiry = new Date(Date.now() + OTP_TTL_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode: otp, otpExpiry },
  });

  const emailResult = await sendTwoFactorOtpEmail({
    to: user.email,
    secondaryEmail: user.secondaryEmail,
    otp,
    userName: user.name,
  });

  if (!emailResult.success) {
    return { success: false, error: emailResult.message };
  }

  return { success: true, requires2FA: true, email: user.email };
}

export async function verifyOTP(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedCode = code.trim();

  if (!trimmedEmail || !/^\d{6}$/.test(trimmedCode)) {
    return { success: false, error: "Invalid verification code" };
  }

  const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
  if (!user || !user.isActive) {
    return { success: false, error: "Invalid verification code" };
  }

  if (!userRequiresTwoFactor(user)) {
    return { success: false, error: "Two-factor authentication is not required" };
  }

  if (!user.otpCode || !user.otpExpiry || user.otpExpiry < new Date()) {
    return { success: false, error: "Verification code expired" };
  }

  if (user.otpCode !== trimmedCode) {
    return { success: false, error: "Invalid verification code" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode: null, otpExpiry: null },
  });

  await setTwoFactorPassCookie(user.id);

  return { success: true };
}

export async function userNeedsTwoFactorByEmail(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { role: true, isTwoFactorEnabled: true },
  });
  if (!user) return false;
  return userRequiresTwoFactor(user);
}
