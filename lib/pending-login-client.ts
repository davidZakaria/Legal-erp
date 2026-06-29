import {
  OTP_RESEND_COOLDOWN_MS,
  PENDING_LOGIN_SESSION_MS,
} from "@/lib/two-factor-config";

export const PENDING_LOGIN_KEY = "njd-pending-login";

export type PendingLoginSession = {
  email: string;
  pendingLoginToken: string;
  exp: number;
  otpSentAt: number;
  devOtp?: string;
};

export function readPendingLoginSession(): PendingLoginSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem(PENDING_LOGIN_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PendingLoginSession>;
    if (!parsed.email || !parsed.pendingLoginToken || !parsed.exp) {
      return null;
    }
    return {
      email: parsed.email,
      pendingLoginToken: parsed.pendingLoginToken,
      exp: parsed.exp,
      otpSentAt: parsed.otpSentAt ?? parsed.exp - PENDING_LOGIN_SESSION_MS,
      devOtp: parsed.devOtp,
    };
  } catch {
    return null;
  }
}

export function writePendingLoginSession(session: PendingLoginSession): void {
  sessionStorage.setItem(PENDING_LOGIN_KEY, JSON.stringify(session));
}

export function clearPendingLoginSession(): void {
  sessionStorage.removeItem(PENDING_LOGIN_KEY);
}

export function computeResendCooldownSeconds(otpSentAt?: number): number {
  if (!otpSentAt) {
    return 0;
  }
  const remaining = OTP_RESEND_COOLDOWN_MS - (Date.now() - otpSentAt);
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

export function isPendingLoginSessionValid(
  session: PendingLoginSession,
  email: string
): boolean {
  return (
    session.exp >= Date.now() &&
    session.email.trim().toLowerCase() === email.trim().toLowerCase() &&
    Boolean(session.pendingLoginToken)
  );
}
