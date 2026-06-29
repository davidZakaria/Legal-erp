import {
  PrismaClient,
  Role,
  CourtSessionStatus,
  LawsuitStatus,
  LegalTaskStatus,
  PowerOfAttorneyStatus,
  ExecutionRequestStatus,
  ExpenseStatus,
  LegalDocumentCategory,
  AssemblyType,
  ProsecutionStatus,
  LegalNoticeDeliveryStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays, startOfDay, startOfMonth, subMonths } from "date-fns";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

const SUPER_ADMIN_EMAIL = "davidsamiii97@gmail.com";
const SUPER_ADMIN_PASSWORD = "David01858971234M$.P@$$w0rd824600";

const PDF_STUB = "%PDF-1.4 NJD Legal ERP preview document";

async function ensurePdf(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, PDF_STUB);
  }
}

async function seedFiles() {
  await ensurePdf(path.resolve("./uploads/contracts/sample-contract.pdf"));
  await ensurePdf(path.resolve("./public/uploads/library/njd-contract-template.pdf"));
  await ensurePdf(path.resolve("./public/uploads/library/defense-memo-template.pdf"));
  await ensurePdf(path.resolve("./public/uploads/library/gafi-assembly-form.pdf"));
  await ensurePdf(path.resolve("./public/uploads/library/building-law-excerpt.pdf"));
  await ensurePdf(path.resolve("./public/uploads/lawsuits/case-1234-poa.pdf"));
  await ensurePdf(path.resolve("./public/uploads/lawsuits/case-5678-expert-report.pdf"));
  await ensurePdf(path.resolve("./public/uploads/expenses/receipt-filing-fees.pdf"));
}

import { clearOperationalData } from "@/lib/clear-operational-data";

async function clearAllUsers() {
  await prisma.user.deleteMany({});
}

async function seedLookups() {
  const courts = [
    "محكمة القاهرة الاقتصادية",
    "محكمة شمال القاهرة الابتدائية",
    "محكمة جنوب القاهرة الابتدائية",
    "محكمة استئناف القاهرة",
    "المحكمة الاقتصادية",
  ];
  const stations = [
    "قسم التجمع الخامس",
    "قسم شرطة مدينة نصر",
    "قسم شرطة المعادي",
    "قسم شرطة المطرية",
    "قسم شرطة حلوان",
  ];
  const expertOffices = [
    "مصلحة الخبراء بالعباسية",
    "مكتب خبراء محكمة شمال القاهرة",
    "مكتب خبراء محكمة استئناف القاهرة",
    "مكتب الدكتور أحمد الخبير",
  ];

  for (const name of courts) {
    await prisma.courtLookup.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  for (const name of stations) {
    await prisma.policeStationLookup.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  for (const name of expertOffices) {
    await prisma.expertOfficeLookup.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}

async function main() {
  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
  const now = new Date();
  const guaranteeRadarExpiry = startOfDay(addDays(now, 5));
  const sessionTomorrow = startOfDay(addDays(now, 1));
  const noticeFollowUpOverdue = startOfDay(subDays(now, 1));
  const crExpirySoon = startOfDay(addDays(now, 10));

  await seedFiles();
  await seedLookups();
  await clearOperationalData();
  await clearAllUsers();

  const david = await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: {
      name: "David Sami",
      passwordHash,
      role: Role.SUPER_ADMIN,
      permissions: [],
      isActive: true,
      isTwoFactorEnabled: false,
      requiresPasswordChange: false,
    },
    create: {
      name: "David Sami",
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      phone: "+201000000011",
      role: Role.SUPER_ADMIN,
      permissions: [],
      isActive: true,
      isTwoFactorEnabled: false,
      requiresPasswordChange: false,
    },
  });

  const jura = await prisma.project.upsert({
    where: { id: "seed-project-jura" },
    update: {},
    create: { id: "seed-project-jura", name: "مشروع جورا", location: "التجمع الخامس" },
  });

  const jamila = await prisma.project.upsert({
    where: { id: "seed-project-jamila" },
    update: {},
    create: { id: "seed-project-jamila", name: "مشروع جميلة", location: "6 أكتوبر" },
  });

  const greenAvenue = await prisma.project.upsert({
    where: { id: "seed-project-green" },
    update: {},
    create: { id: "seed-project-green", name: "جرين أفينيو", location: "الشيخ زايد" },
  });

  const galala = await prisma.project.upsert({
    where: { id: "seed-project-galala" },
    update: {},
    create: { id: "seed-project-galala", name: "مشروع الجلالة", location: "العين السخنة" },
  });

  // ── Contracts: radar trigger (guarantee expires in exactly 5 days) ──
  const radarContract = await prisma.contract.create({
    data: {
      projectId: jura.id,
      contractorName: "شركة المقاولون العرب — عقد رئيسي",
      totalValue: 25_000_000,
      penaltyClause: "2% غرامة أسبوعية عن كل أسبوع تأخير + حق فسخ العقد",
      guaranteeExpiryDate: guaranteeRadarExpiry,
      status: "ACTIVE",
      fileUrl: "sample-contract.pdf",
    },
  });

  await prisma.contract.createMany({
    data: [
      {
        projectId: jura.id,
        contractorName: "شركة البناء المتحدة",
        totalValue: 15_000_000,
        penaltyClause: "10% من قيمة العقد عند التأخير",
        guaranteeExpiryDate: addDays(now, 12),
        status: "ACTIVE",
        fileUrl: "sample-contract.pdf",
      },
      {
        projectId: jamila.id,
        contractorName: "المقاولون المصريون",
        totalValue: 8_500_000,
        penaltyClause: "5% أسبوعياً عن كل أسبوع تأخير",
        guaranteeExpiryDate: addDays(now, 22),
        status: "ACTIVE",
        fileUrl: "sample-contract.pdf",
      },
      {
        projectId: greenAvenue.id,
        contractorName: "Delta Construction Co.",
        totalValue: 22_000_000,
        penaltyClause: "8% delay penalty clause",
        guaranteeExpiryDate: addDays(now, 90),
        status: "ACTIVE",
        fileUrl: "sample-contract.pdf",
      },
      {
        projectId: galala.id,
        contractorName: "الحسين للمقاولات",
        totalValue: 31_500_000,
        penaltyClause: "15% غرامة تأخير + فسخ العقد",
        guaranteeExpiryDate: addDays(now, 180),
        status: "ACTIVE",
        fileUrl: "sample-contract.pdf",
      },
      {
        projectId: jura.id,
        contractorName: "مؤسسة النيل للتشطيبات",
        totalValue: 4_200_000,
        penaltyClause: "3% شهرياً",
        guaranteeExpiryDate: subDays(now, 30),
        status: "ACTIVE",
        fileUrl: "sample-contract.pdf",
      },
    ],
  });

  // ── GAFI tasks (overdue + today + upcoming + completed) ──
  await prisma.gAFITask.createMany({
    data: [
      {
        taskType: "ASSEMBLY",
        title: "اجتماع الجمعية العامة العادية 2025",
        deadline: addDays(now, 25),
        status: "PENDING",
      },
      {
        taskType: "TRADEMARK",
        title: "تجديد العلامة التجارية NJD",
        deadline: addDays(now, 45),
        status: "IN_PROGRESS",
      },
      {
        taskType: "ASSEMBLY",
        title: "محضر جمعية تأسيس فرع الجلالة",
        deadline: subDays(now, 3),
        status: "PENDING",
      },
      {
        taskType: "TRADEMARK",
        title: "تسجيل علامة Green Avenue",
        deadline: addDays(now, 1),
        status: "PENDING",
      },
      {
        taskType: "ASSEMBLY",
        title: "اعتماد ميزانية 2024",
        deadline: subMonths(now, 2),
        status: "COMPLETED",
      },
    ],
  });

  // ── Lawsuits (multiple courts, statuses, lawyers) ──
  const lawsuitEconomic = await prisma.lawsuit.create({
    data: {
      caseNumber: "1234",
      year: 2025,
      courtName: "محكمة القاهرة الاقتصادية",
      opponentName: "شركة المنافس للتطوير العقاري",
      clientName: "NJD",
      archiveNumber: "45",
      registrationDate: subMonths(now, 4),
      overallStatus: LawsuitStatus.ACTIVE,
      awardedCompensation: 1_500_000,
      judicialFees: 5_000,
      assignedLawyerId: david.id,
      courtSessions: {
        create: [
          {
            sessionDate: sessionTomorrow,
            requiredAction: "تقديم مذكرة دفاع وطلب تأجيل",
            status: CourtSessionStatus.PENDING,
          },
          {
            sessionDate: subDays(now, 7),
            requiredAction: "مرافعة شفهية",
            status: CourtSessionStatus.COMPLETED,
            sessionOutcome: "تأجيل لجلسة 20/6 لتقديم مستندات إضافية",
          },
          {
            sessionDate: subDays(now, 45),
            requiredAction: "إعلان الخصم",
            status: CourtSessionStatus.COMPLETED,
            sessionOutcome: "تم الإعلان وتحديد جلسة",
          },
        ],
      },
      attachments: {
        create: [
          {
            fileName: "توكيل-رسمي.pdf",
            fileUrl: "/uploads/lawsuits/case-1234-poa.pdf",
            uploadedAt: subDays(now, 30),
          },
        ],
      },
    },
  });

  const lawsuitNorth = await prisma.lawsuit.create({
    data: {
      caseNumber: "5678",
      year: 2024,
      courtName: "محكمة شمال القاهرة الابتدائية",
      opponentName: "مقاول فرعي - أعمال سباكة",
      clientName: "NJD",
      archiveNumber: "102",
      registrationDate: subMonths(now, 8),
      overallStatus: LawsuitStatus.RESERVED,
      isAtExperts: true,
      expertOffice: "مصلحة الخبراء بالعباسية",
      expertName: "م/ محمد فتحي",
      expertFileNumber: "884/2024",
      awardedCompensation: 250_000,
      judicialFees: 15_000,
      assignedLawyerId: david.id,
      courtSessions: {
        create: [
          {
            sessionDate: addDays(now, 7),
            sessionType: "EXPERT",
            requiredAction: "حضور مع الخبير لمعاينة الموقع",
            status: CourtSessionStatus.PENDING,
          },
          {
            sessionDate: subDays(now, 21),
            sessionType: "EXPERT",
            requiredAction: "تسليم مذكرة فنية للخبير",
            status: CourtSessionStatus.COMPLETED,
            sessionOutcome: "تم تسليم المذكرة وتحديد جلسة معاينة",
          },
          {
            sessionDate: addDays(now, 14),
            sessionType: "COURT",
            requiredAction: "استلام الحكم وإيداعه",
            status: CourtSessionStatus.PENDING,
          },
          {
            sessionDate: subDays(now, 14),
            sessionType: "COURT",
            requiredAction: "مرافعة ختامية",
            status: CourtSessionStatus.COMPLETED,
            sessionOutcome: "حجز الدعوى للحكم بجلسة 20/7",
          },
        ],
      },
      attachments: {
        create: [
          {
            fileName: "تقرير-خبير-فني.pdf",
            fileUrl: "/uploads/lawsuits/case-5678-expert-report.pdf",
            uploadedAt: subDays(now, 20),
          },
        ],
      },
    },
  });

  const lawsuitAdmin = await prisma.lawsuit.create({
    data: {
      caseNumber: "890",
      year: 2025,
      courtName: "محكمة القاهرة للأمور المستعجلة",
      opponentName: "سكان عمارة B - مشروع جميلة",
      clientName: "NJD - مشروع جميلة",
      archiveNumber: "118",
      registrationDate: subMonths(now, 1),
      overallStatus: LawsuitStatus.UNDER_REVIEW,
      assignedLawyerId: david.id,
      courtSessions: {
        create: {
          sessionDate: subDays(now, 2),
          requiredAction: "تقديم مستندات إثبات الملكية",
          status: CourtSessionStatus.PENDING,
        },
      },
    },
  });

  const lawsuitFinished = await prisma.lawsuit.create({
    data: {
      caseNumber: "2210",
      year: 2023,
      courtName: "محكمة استئناف القاهرة",
      opponentName: "شركة التوريدات الحديثة",
      clientName: "NJD",
      archiveNumber: "07",
      registrationDate: subMonths(now, 18),
      overallStatus: LawsuitStatus.COMPLETED,
      awardedCompensation: 500000,
      judicialFees: 22000,
      assignedLawyerId: david.id,
      courtSessions: {
        create: {
          sessionDate: subMonths(now, 3),
          requiredAction: "تنفيذ الحكم",
          status: CourtSessionStatus.COMPLETED,
          sessionOutcome: "انقضاء الدعوى بالترك",
        },
      },
    },
  });

  await prisma.lawsuit.create({
    data: {
      caseNumber: "3344",
      year: 2025,
      courtName: "المحكمة الإدارية العليا",
      opponentName: "هيئة المجتمعات العمرانية",
      clientName: "NJD",
      archiveNumber: "203",
      registrationDate: subDays(now, 20),
      overallStatus: LawsuitStatus.ACTIVE,
      assignedLawyerId: david.id,
      courtSessions: {
        create: {
          sessionDate: addDays(now, 0),
          requiredAction: "جلسة مرافعة - طلب إلغاء قرار إدارى",
          status: CourtSessionStatus.PENDING,
        },
      },
    },
  });

  // ── Legal notices (overdue bailiff follow-up demo) ──
  await prisma.legalNotice.createMany({
    data: [
      {
        noticeNumber: "2847",
        year: "2025",
        bailiffOffice: "محكمة جنوب القاهرة — إدارة التحصيل",
        clientName: "NJD - مشروع جورا",
        opponentName: "مقاول الباطن — أعمال تشطيبات",
        noticeType: "إنذار بالأداء",
        submissionDate: subDays(now, 14),
        deliveryStatus: LegalNoticeDeliveryStatus.PENDING,
        followUpDate: noticeFollowUpOverdue,
        assignedLawyerId: david.id,
        contractId: radarContract.id,
        notes: "متابعة عاجلة — تجاوز موعد متابعة المحضر",
      },
      {
        noticeNumber: "3102",
        year: "2025",
        bailiffOffice: "محكمة القاهرة الاقتصادية — محضر قضائي",
        clientName: "NJD",
        opponentName: "شركة المنافس للتطوير العقاري",
        noticeType: "مطالبات مالية",
        submissionDate: subDays(now, 7),
        deliveryStatus: LegalNoticeDeliveryStatus.DELIVERED_SUCCESS,
        deliveryDate: subDays(now, 3),
        followUpDate: addDays(now, 14),
        assignedLawyerId: david.id,
        lawsuitId: lawsuitEconomic.id,
      },
    ],
  });

  // ── Subsidiary companies & assembly archive ──
  const subsidiaryNjd = await prisma.subsidiaryCompany.create({
    data: {
      name: "NJD للتطوير العقاري",
      commercialRegister: "123456",
      crExpiryDate: crExpirySoon,
      taxCard: "987-654-321",
      taxCardExpiryDate: addDays(now, 52),
      boardExpiryDate: addDays(now, 90),
      capitalPaidDetails: "تم سداد 100%",
    },
  });

  const subsidiaryGreen = await prisma.subsidiaryCompany.create({
    data: {
      name: "Green Avenue للاستثمار",
      commercialRegister: "654321",
      crExpiryDate: addDays(now, 120),
      taxCard: "111-222-333",
      taxCardExpiryDate: addDays(now, 25),
      boardExpiryDate: addDays(now, 40),
      capitalPaidDetails: "تم سداد 75%",
    },
  });

  await prisma.assemblyArchive.createMany({
    data: [
      {
        companyId: subsidiaryNjd.id,
        type: AssemblyType.ORDINARY,
        dateHeld: subMonths(now, 6),
        fileUrl: null,
      },
      {
        companyId: subsidiaryGreen.id,
        type: AssemblyType.EXTRAORDINARY,
        dateHeld: subMonths(now, 2),
        fileUrl: null,
      },
    ],
  });

  // ── Prosecutions ──
  await prisma.prosecution.createMany({
    data: [
      {
        caseNumber: "9012",
        reportNumber: "1245/2025",
        year: 2025,
        policeStation: "قسم التجمع الخامس",
        clientName: "NJD - مشروع جورا",
        issueType: "شيك بدون رصيد",
        status: ProsecutionStatus.POLICE_REPORT,
        assignedLawyerId: david.id,
      },
      {
        caseNumber: "3456",
        reportNumber: "889/2025",
        year: 2025,
        policeStation: "نيابة 6 أكتوبر",
        clientName: "NJD - مشروع جميلة",
        issueType: "إيصال أمانة",
        status: ProsecutionStatus.IN_COURT,
        assignedLawyerId: david.id,
      },
      {
        caseNumber: "7890",
        reportNumber: "210/2024",
        year: 2024,
        policeStation: "قسم شرطة الجلالة",
        clientName: "NJD - الجلالة",
        issueType: "تعدي على أرض",
        status: ProsecutionStatus.POLICE_REPORT,
        assignedLawyerId: david.id,
      },
      {
        caseNumber: "1122",
        reportNumber: "556/2025",
        year: 2025,
        policeStation: "قسم الشيخ زايد",
        clientName: "NJD - Green Avenue",
        issueType: "تبديد",
        status: ProsecutionStatus.ARCHIVED_SAVED,
        assignedLawyerId: david.id,
      },
      {
        caseNumber: "5566",
        reportNumber: "991/2024",
        year: 2024,
        policeStation: "نيابة شمال الجيزة",
        clientName: "مورد حديد - NJD",
        issueType: "نصب واستيلاء",
        status: ProsecutionStatus.IN_COURT,
        assignedLawyerId: david.id,
      },
    ],
  });

  // ── Legal tasks (mix of overdue, today, future, completed) ──
  await prisma.legalTask.createMany({
    data: [
      {
        title: "كتابة مذكرة دفاع - قضية 1234",
        description: "إعداد مذكرة للجلسة غداً",
        deadline: subDays(now, 2),
        assignedLawyerId: david.id,
      },
      {
        title: "مراجعة عقد مقاول فرعي",
        description: "مراجعة بنود الجزاء والضمان",
        deadline: addDays(now, 1),
        assignedLawyerId: david.id,
      },
      {
        title: "متابعة توثيق توكيل رسمي",
        deadline: addDays(now, 5),
        assignedLawyerId: david.id,
      },
      {
        title: "إعداد لائحة اعتراض إدارى",
        deadline: subDays(now, 5),
        assignedLawyerId: david.id,
      },
      {
        title: "تسليم أصول ملف قضية 2210",
        deadline: subMonths(now, 1),
        status: LegalTaskStatus.COMPLETED,
        assignedLawyerId: david.id,
      },
      {
        title: "تنسيق مع خبير فني - قضية 5678",
        deadline: subDays(now, 10),
        status: LegalTaskStatus.COMPLETED,
        assignedLawyerId: david.id,
      },
      {
        title: "تحديث سجل الوكالات",
        deadline: addDays(now, 10),
        assignedLawyerId: david.id,
      },
    ],
  });

  // ── Powers of attorney ──
  await prisma.powerOfAttorney.createMany({
    data: [
      {
        poaNumber: "POA-2025-001",
        clientName: "NJD",
        type: "عام",
        expiryDate: addDays(now, 180),
        status: PowerOfAttorneyStatus.ACTIVE,
        assignedLawyerId: david.id,
      },
      {
        poaNumber: "POA-2025-014",
        clientName: "NJD - مشروع جميلة",
        type: "خاص",
        expiryDate: addDays(now, 60),
        status: PowerOfAttorneyStatus.ACTIVE,
        assignedLawyerId: david.id,
      },
      {
        poaNumber: "POA-2024-088",
        clientName: "NJD",
        type: "عام",
        expiryDate: subDays(now, 15),
        status: PowerOfAttorneyStatus.REVOKED,
        assignedLawyerId: david.id,
      },
    ],
  });

  // ── Execution requests ──
  await prisma.executionRequest.createMany({
    data: [
      {
        lawsuitId: lawsuitEconomic.id,
        executionType: "إخلاء",
        status: ExecutionRequestStatus.PENDING_BAILIFF,
        assignedLawyerId: david.id,
      },
      {
        lawsuitId: lawsuitNorth.id,
        executionType: "حجز",
        status: ExecutionRequestStatus.PENDING_BAILIFF,
        assignedLawyerId: david.id,
      },
      {
        lawsuitId: lawsuitFinished.id,
        executionType: "بيع بالمزاد",
        status: ExecutionRequestStatus.EXECUTED,
        assignedLawyerId: david.id,
      },
    ],
  });

  // ── Expenses (all statuses, this month + prior) ──
  await prisma.expense.createMany({
    data: [
      {
        amount: 2500,
        description: "رسوم قيد دعوى 1234/2025",
        date: now,
        lawsuitId: lawsuitEconomic.id,
        requestedById: david.id,
        status: ExpenseStatus.PENDING_APPROVAL,
      },
      {
        amount: 800,
        description: "تصوير مستندات وتوثيق",
        date: subDays(now, 3),
        requestedById: david.id,
        status: ExpenseStatus.PENDING_APPROVAL,
      },
      {
        amount: 1500,
        description: "أتعاب خبير فني - قضية 5678",
        date: subDays(now, 10),
        lawsuitId: lawsuitNorth.id,
        requestedById: david.id,
        status: ExpenseStatus.APPROVED,
      },
      {
        amount: 350,
        description: "مواصلات وانتقالات محكمة",
        date: subDays(now, 5),
        requestedById: david.id,
        status: ExpenseStatus.APPROVED,
      },
      {
        amount: 4200,
        description: "رسوم طعن إدارى + إيداع",
        date: startOfMonth(now),
        lawsuitId: lawsuitAdmin.id,
        requestedById: david.id,
        status: ExpenseStatus.REIMBURSED,
        receiptUrl: "/uploads/expenses/receipt-filing-fees.pdf",
      },
      {
        amount: 600,
        description: "طوابع وتحصيل رسوم",
        date: subMonths(now, 1),
        requestedById: david.id,
        status: ExpenseStatus.REIMBURSED,
      },
      {
        amount: 1200,
        description: "عهدة طوارئ - نيابة التجمع",
        date: subDays(now, 1),
        requestedById: david.id,
        status: ExpenseStatus.PENDING_APPROVAL,
      },
    ],
  });

  // ── Legal library (all categories) ──
  await prisma.legalDocument.createMany({
    data: [
      {
        title: "نموذج عقد مقاولات موحد - NJD",
        category: LegalDocumentCategory.CONTRACT_TEMPLATE,
        fileUrl: "/uploads/library/njd-contract-template.pdf",
        uploadedById: david.id,
        uploadedAt: subMonths(now, 6),
      },
      {
        title: "نموذج عقد مقاول باطن",
        category: LegalDocumentCategory.CONTRACT_TEMPLATE,
        fileUrl: "/uploads/library/njd-contract-template.pdf",
        uploadedById: david.id,
        uploadedAt: subMonths(now, 3),
      },
      {
        title: "صيغة مذكرة دفاع مدنية",
        category: LegalDocumentCategory.INTERNAL_MEMO,
        fileUrl: "/uploads/library/defense-memo-template.pdf",
        uploadedById: david.id,
      },
      {
        title: "صيغة إنذار رسمي على محل",
        category: LegalDocumentCategory.INTERNAL_MEMO,
        fileUrl: "/uploads/library/defense-memo-template.pdf",
        uploadedById: david.id,
      },
      {
        title: "نموذج محضر جمعية عمومية",
        category: LegalDocumentCategory.GAFI_FORM,
        fileUrl: "/uploads/library/gafi-assembly-form.pdf",
        uploadedById: david.id,
      },
      {
        title: "طلب تجديد سجل تجاري",
        category: LegalDocumentCategory.GAFI_FORM,
        fileUrl: "/uploads/library/gafi-assembly-form.pdf",
        uploadedById: david.id,
      },
      {
        title: "قانون 119 لسنة 2008 - المناقصات",
        category: LegalDocumentCategory.LAWS,
        fileUrl: "/uploads/library/building-law-excerpt.pdf",
        uploadedById: david.id,
      },
      {
        title: "قانون 4 لسنة 1996 - تنظيم المباني",
        category: LegalDocumentCategory.LAWS,
        fileUrl: "/uploads/library/building-law-excerpt.pdf",
        uploadedById: david.id,
      },
    ],
  });

  // ── Audit log samples ──
  await prisma.auditLog.createMany({
    data: [
      { userId: david.id, action: "CREATE", entityName: "Lawsuit", entityId: lawsuitEconomic.id, timestamp: subMonths(now, 4) },
      { userId: david.id, action: "CREATE", entityName: "Contract", entityId: radarContract.id, timestamp: subMonths(now, 2) },
      { userId: david.id, action: "SESSION_OUTCOME", entityName: "CourtSession", entityId: "seed", timestamp: subDays(now, 7) },
      { userId: david.id, action: "APPROVE", entityName: "Expense", entityId: "seed", timestamp: subDays(now, 8) },
      { userId: david.id, action: "UPLOAD", entityName: "LegalDocument", entityId: "seed", timestamp: subDays(now, 14) },
      { userId: david.id, action: "CREATE", entityName: "Prosecution", entityId: "seed", timestamp: subDays(now, 21) },
      { userId: david.id, action: "CREATE", entityName: "GAFITask", entityId: "seed", timestamp: subDays(now, 30) },
    ],
  });

  console.log("Seeding Complete!");
  console.log("");
  console.log(`Super Admin: ${SUPER_ADMIN_EMAIL} (no 2FA, no password change required)`);
  console.log("");
  console.log("Presentation highlights:");
  console.log(`  Guarantee radar: contract expires ${guaranteeRadarExpiry.toISOString().slice(0, 10)} (5 days)`);
  console.log(`  Lawsuit 1234/2025: compensation 1,500,000 EGP, session tomorrow`);
  console.log(`  Lawsuit 5678/2024: at experts (مصلحة الخبراء بالعباسية)`);
  console.log(`  Legal notice #2847: overdue bailiff follow-up (${noticeFollowUpOverdue.toISOString().slice(0, 10)})`);
  console.log(`  Subsidiary CR expiry: ${crExpirySoon.toISOString().slice(0, 10)} (10 days)`);
  console.log("  All records assigned to David Sami for dashboard demo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
