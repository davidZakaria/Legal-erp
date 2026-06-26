import { Role } from "@prisma/client";

type TwoFactorUser = {
  role: Role;
  isTwoFactorEnabled: boolean;
};

export function userRequiresTwoFactor(user: TwoFactorUser): boolean {
  return user.role === Role.SUPER_ADMIN || user.isTwoFactorEnabled;
}
