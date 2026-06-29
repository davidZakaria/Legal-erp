/**
 * 2FA timing configuration.
 *
 * Trusted device (TWO_FACTOR_TRUST_HOURS, default 2): same browser skips email OTP
 * on re-login within that window — including after logout.
 *
 * Pending login / OTP validity: short windows for entering the email code only.
 */
export const OTP_VALIDITY_MINUTES = 8;
export const OTP_VALIDITY_MS = OTP_VALIDITY_MINUTES * 60 * 1000;

export const PENDING_LOGIN_SESSION_MINUTES = 12;
export const PENDING_LOGIN_SESSION_MS = PENDING_LOGIN_SESSION_MINUTES * 60 * 1000;

export const OTP_RESEND_COOLDOWN_SECONDS = 90;
export const OTP_RESEND_COOLDOWN_MS = OTP_RESEND_COOLDOWN_SECONDS * 1000;

export const OTP_MAX_ATTEMPTS = 5;
export const OTP_LOCKOUT_MINUTES = 15;
export const OTP_LOCKOUT_MS = OTP_LOCKOUT_MINUTES * 60 * 1000;

export const TWO_FACTOR_PASS_MINUTES = 5;
export const TWO_FACTOR_PASS_SECONDS = TWO_FACTOR_PASS_MINUTES * 60;
export const TWO_FACTOR_PASS_MS = TWO_FACTOR_PASS_SECONDS * 1000;

const DEFAULT_TRUST_HOURS = 2;
const MAX_TRUST_HOURS = 24;

/** Hours to skip email OTP on a trusted browser after successful 2FA. */
export function getTwoFactorTrustHours(): number {
  const raw = process.env.TWO_FACTOR_TRUST_HOURS?.trim();
  if (!raw) {
    return DEFAULT_TRUST_HOURS;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_TRUST_HOURS;
  }
  return Math.min(parsed, MAX_TRUST_HOURS);
}

export function getTwoFactorTrustMs(): number {
  return getTwoFactorTrustHours() * 60 * 60 * 1000;
}

export function getTwoFactorTrustSeconds(): number {
  return getTwoFactorTrustHours() * 60 * 60;
}
