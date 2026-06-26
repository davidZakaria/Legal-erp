import { Role } from "@prisma/client";

/** The only account allowed to hold SUPER_ADMIN. */
export const SOLE_SUPER_ADMIN_EMAIL = "davidsamiii97@gmail.com";

export function isSoleSuperAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === SOLE_SUPER_ADMIN_EMAIL;
}

type TwoFactorUser = {
  role: Role;
  isTwoFactorEnabled: boolean;
};

export function userRequiresTwoFactor(user: TwoFactorUser): boolean {
  return user.role === Role.SUPER_ADMIN || user.isTwoFactorEnabled;
}
