import { PrismaClient, Role, CourtSessionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays } from "date-fns";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@njd.com" },
    update: {},
    create: {
      name: "أحمد المدير",
      email: "admin@njd.com",
      passwordHash,
      phone: "+201000000001",
      role: Role.SUPER_ADMIN,
    },
  });

  const legalManager = await prisma.user.upsert({
    where: { email: "manager@njd.com" },
    update: {},
    create: {
      name: "محمد القانوني",
      email: "manager@njd.com",
      passwordHash,
      phone: "+201000000002",
      role: Role.LEGAL_MANAGER,
    },
  });

  const lawyer = await prisma.user.upsert({
    where: { email: "lawyer@njd.com" },
    update: {},
    create: {
      name: "سارة المحامية",
      email: "lawyer@njd.com",
      passwordHash,
      phone: "+201000000003",
      role: Role.LAWYER,
    },
  });

  const jura = await prisma.project.upsert({
    where: { id: "seed-project-jura" },
    update: {},
    create: {
      id: "seed-project-jura",
      name: "مشروع جورا",
      location: "Jura",
    },
  });

  const jamila = await prisma.project.upsert({
    where: { id: "seed-project-jamila" },
    update: {},
    create: {
      id: "seed-project-jamila",
      name: "مشروع جميلة",
      location: "Jamila",
    },
  });

  const greenAvenue = await prisma.project.upsert({
    where: { id: "seed-project-green" },
    update: {},
    create: {
      id: "seed-project-green",
      name: "جرين أفينيو",
      location: "Green Avenue",
    },
  });

  const uploadDir = path.resolve("./uploads/contracts");
  await fs.mkdir(uploadDir, { recursive: true });
  const sampleFile = path.join(uploadDir, "sample-contract.pdf");
  try {
    await fs.access(sampleFile);
  } catch {
    await fs.writeFile(sampleFile, "%PDF-1.4 Sample Contract File for NJD Legal ERP");
  }

  await prisma.contract.deleteMany({});
  await prisma.contract.createMany({
    data: [
      {
        projectId: jura.id,
        contractorName: "شركة البناء المتحدة",
        totalValue: 15000000,
        penaltyClause: "10% من قيمة العقد",
        guaranteeExpiryDate: addDays(new Date(), 15),
        status: "ACTIVE",
        fileUrl: "sample-contract.pdf",
      },
      {
        projectId: jamila.id,
        contractorName: "المقاولون المصريون",
        totalValue: 8500000,
        penaltyClause: "5% أسبوعياً",
        guaranteeExpiryDate: addDays(new Date(), 90),
        status: "ACTIVE",
        fileUrl: "sample-contract.pdf",
      },
      {
        projectId: greenAvenue.id,
        contractorName: "Delta Construction",
        totalValue: 22000000,
        penaltyClause: "8% delay penalty",
        guaranteeExpiryDate: addDays(new Date(), 180),
        status: "ACTIVE",
        fileUrl: "sample-contract.pdf",
      },
    ],
  });

  await prisma.gAFITask.deleteMany({});
  await prisma.gAFITask.createMany({
    data: [
      {
        taskType: "ASSEMBLY",
        title: "اجتماع الجمعية العامة السنوي",
        deadline: addDays(new Date(), 30),
        status: "PENDING",
      },
      {
        taskType: "TRADEMARK",
        title: "تجديد العلامة التجارية NJD",
        deadline: addDays(new Date(), 45),
        status: "IN_PROGRESS",
      },
    ],
  });

  await prisma.courtSession.deleteMany({});
  await prisma.lawsuit.deleteMany({});

  const lawsuit1 = await prisma.lawsuit.create({
    data: {
      caseNumber: "1234",
      year: 2025,
      courtName: "محكمة القاهرة الاقتصادية",
      opponentName: "شركة المنافس",
      assignedLawyerId: lawyer.id,
      courtSessions: {
        create: [
          {
            sessionDate: addDays(new Date(), 1),
            requiredAction: "تقديم مذكرة دفاع",
            status: CourtSessionStatus.PENDING,
            isReminderSent: false,
          },
          {
            sessionDate: addDays(new Date(), -7),
            requiredAction: "مرافعة شفهية",
            status: CourtSessionStatus.COMPLETED,
            sessionOutcome: "تأجيل للجلسة القادمة",
          },
        ],
      },
    },
  });

  await prisma.lawsuit.create({
    data: {
      caseNumber: "5678",
      year: 2024,
      courtName: "محكمة شمال القاهرة",
      opponentName: "مقاول فرعي",
      assignedLawyerId: lawyer.id,
      courtSessions: {
        create: {
          sessionDate: addDays(new Date(), 14),
          requiredAction: "استلام حكم",
          status: CourtSessionStatus.PENDING,
        },
      },
    },
  });

  await prisma.prosecution.deleteMany({});
  await prisma.prosecution.createMany({
    data: [
      {
        caseNumber: "9012",
        year: 2025,
        policeStation: "التجمع الخامس",
        clientName: "NJD - مشروع جورا",
        issueType: "شيك بدون رصيد",
        status: "POLICE_REPORT",
        assignedLawyerId: lawyer.id,
      },
      {
        caseNumber: "3456",
        year: 2025,
        policeStation: "التجمع الخامس",
        clientName: "NJD - مشروع جميلة",
        issueType: "إيصال أمانة",
        status: "IN_COURT",
        assignedLawyerId: lawyer.id,
      },
      {
        caseNumber: "7890",
        year: 2024,
        policeStation: "الجلالة",
        clientName: "NJD - الجلالة",
        issueType: "تعدي على أرض",
        status: "POLICE_REPORT",
        assignedLawyerId: lawyer.id,
      },
    ],
  });

  await prisma.auditLog.deleteMany({});
  await prisma.auditLog.create({
    data: {
      userId: superAdmin.id,
      action: "SEED",
      entityName: "System",
      entityId: "init",
    },
  });

  console.log("Seed completed.");
  console.log("Users: admin@njd.com, manager@njd.com, lawyer@njd.com / password123");
  console.log("Lawsuit with tomorrow session:", lawsuit1.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
