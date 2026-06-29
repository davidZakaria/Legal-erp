/**
 * Verify whether a password matches the stored hash for a user.
 * Usage (on VPS): npx tsx scripts/verify-user-password.ts davidsamii97@gmail.com 'YourPassword'
 */
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Usage: npx tsx scripts/verify-user-password.ts <email> <password>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log("RESULT: USER_NOT_FOUND");
    process.exit(1);
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  console.log("email:", user.email);
  console.log("name:", user.name);
  console.log("role:", user.role);
  console.log("isActive:", user.isActive);
  console.log("isTwoFactorEnabled:", user.isTwoFactorEnabled);
  console.log("requiresPasswordChange:", user.requiresPasswordChange);
  console.log("passwordMatch:", match);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
