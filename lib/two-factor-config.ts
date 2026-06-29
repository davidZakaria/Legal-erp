/**
 * Balanced 2FA timings for email OTP (security + UX for delayed/spam-folder delivery).
 *
 * OTP validity (8 min): short enough to limit replay risk; long enough to find email.
 * Login session (12 min): covers OTP lifetime + one resend cycle.
 * Resend cooldown (90 s): limits abuse while allowing a quick retry.
 * Lockout (15 min after 5 fails): standard brute-force protection.
 * Pass cookie (5 min): window to finish sign-in after OTP is verified.
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
