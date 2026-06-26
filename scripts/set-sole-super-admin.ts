import { PrismaClient, Role } from "@prisma/client";
import { SOLE_SUPER_ADMIN_EMAIL } from "../lib/auth-utils";

const prisma = new PrismaClient();

async function main() {
  const demoted = await prisma.user.updateMany({
    where: {
      role: Role.SUPER_ADMIN,
      NOT: { email: SOLE_SUPER_ADMIN_EMAIL },
    },
    data: { role: Role.LEGAL_MANAGER },
  });

  await prisma.user.updateMany({
    where: { email: SOLE_SUPER_ADMIN_EMAIL },
    data: { role: Role.SUPER_ADMIN },
  });

  const superAdmins = await prisma.user.findMany({
    where: { role: Role.SUPER_ADMIN },
    select: { email: true, name: true },
  });

  console.log(`Demoted ${demoted.count} other super admin(s).`);
  console.log("Current super admins:", superAdmins);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
