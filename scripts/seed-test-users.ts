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

  const manager = await prisma.user.upsert({
    where: { email: "davidsamiii97@gmail.com" },
    update: {
      name: "David Sami — Test Manager",
      passwordHash,
      role: Role.LEGAL_MANAGER,
    },
    create: {
      name: "David Sami — Test Manager",
      email: "davidsamiii97@gmail.com",
      passwordHash,
      phone: "+201000000011",
      role: Role.LEGAL_MANAGER,
    },
  });

  console.log("✓ Test accounts ready (password: password123)");
  console.log(`  Lawyer:  ${lawyer.email} (${lawyer.role})`);
  console.log(`  Manager: ${manager.email} (${manager.role})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
