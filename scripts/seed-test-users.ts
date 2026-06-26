import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const lawyer = await prisma.user.upsert({
    where: { email: "david@newjerseyegypt.com" },
    update: {
      name: "David — Test Lawyer",
      passwordHash,
      role: Role.LAWYER,
    },
    create: {
      name: "David — Test Lawyer",
      email: "david@newjerseyegypt.com",
      passwordHash,
      phone: "+201000000010",
      role: Role.LAWYER,
    },
  });

  const superAdmin = await prisma.user.upsert({
    where: { email: "davidsamiii97@gmail.com" },
    update: {
      name: "David Sami",
      passwordHash,
      role: Role.SUPER_ADMIN,
    },
    create: {
      name: "David Sami",
      email: "davidsamiii97@gmail.com",
      passwordHash,
      phone: "+201000000011",
      role: Role.SUPER_ADMIN,
    },
  });

  console.log("✓ Test accounts ready (password: password123)");
  console.log(`  Lawyer:      ${lawyer.email} (${lawyer.role})`);
  console.log(`  Super Admin: ${superAdmin.email} (${superAdmin.role})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
