import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] ?? "manager@njd.com";
  const user = await prisma.user.findUnique({ where: { email } });
  console.log("user found:", Boolean(user));
  if (user) {
    console.log("role:", user.role, "isActive:", user.isActive);
    console.log(
      "password123 valid:",
      await bcrypt.compare("password123", user.passwordHash)
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
