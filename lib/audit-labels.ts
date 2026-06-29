import { prisma } from "@/lib/prisma";

type Label = { ar: string; en: string };

const entityLabels: Record<string, Label> = {
  Lawsuit: { ar: "دعوى", en: "Lawsuit" },
  Contract: { ar: "عقد", en: "Contract" },
  GAFITask: { ar: "مهمة مؤسسية", en: "Corporate Task" },
  CourtSession: { ar: "جلسة محكمة", en: "Court Session" },
  Prosecution: { ar: "محضر / جنحة", en: "Prosecution" },
  LegalTask: { ar: "مهمة قانونية", en: "Legal Task" },
  PowerOfAttorney: { ar: "توكيل", en: "Power of Attorney" },
  LegalNotice: { ar: "إخطار قانوني", en: "Legal Notice" },
  Expense: { ar: "مصروف", en: "Expense" },
  LegalDocument: { ar: "مستند", en: "Document" },
  SubsidiaryCompany: { ar: "شركة تابعة", en: "Subsidiary" },
  AssemblyArchive: { ar: "محضر جمعية", en: "Assembly Record" },
  ExecutionRequest: { ar: "طلب تنفيذ", en: "Execution Request" },
  User: { ar: "مستخدم", en: "User" },
  BackupLog: { ar: "نسخة احتياطية", en: "Backup" },
  System: { ar: "النظام", en: "System" },
  CourtLookup: { ar: "محكمة", en: "Court" },
  PoliceStationLookup: { ar: "قسم شرطة", en: "Police Station" },
  ExpertOfficeLookup: { ar: "مكتب خبير", en: "Expert Office" },
  Project: { ar: "مشروع", en: "Project" },
};

/** `${action}::${entityName}` — use `*` for any entity */
const actionLabels: Record<string, Label> = {
  // Lawsuits
  "CREATE::Lawsuit": { ar: "إضافة دعوى جديدة", en: "Added New Lawsuit" },
  "UPDATE::Lawsuit": { ar: "تحديث بيانات دعوى", en: "Updated Lawsuit" },
  "DELETE::Lawsuit": { ar: "حذف دعوى", en: "Deleted Lawsuit" },
  "UPLOAD_ATTACHMENT::Lawsuit": { ar: "رفع مرفق لدعوى", en: "Uploaded Lawsuit Attachment" },
  "DELETE_ATTACHMENT::Lawsuit": { ar: "حذف مرفق دعوى", en: "Deleted Lawsuit Attachment" },
  "RETURN_FROM_EXPERTS::Lawsuit": { ar: "إرجاع دعوى من الخبراء", en: "Returned Lawsuit from Experts" },
  "BULK_IMPORT::Lawsuit": { ar: "استيراد دعاوى جماعي", en: "Bulk Imported Lawsuits" },

  // Contracts
  "CREATE::Contract": { ar: "إضافة عقد موقع", en: "Added Site Contract" },
  "UPDATE::Contract": { ar: "تحديث عقد", en: "Updated Contract" },
  "DELETE::Contract": { ar: "حذف عقد", en: "Deleted Contract" },
  "ANALYZE_CONTRACT::Contract": { ar: "تحليل عقد بالذكاء الاصطناعي", en: "Analyzed Contract (AI)" },
  "DOWNLOAD::Contract": { ar: "تحميل عقد", en: "Downloaded Contract" },

  // GAFI / corporate
  "CREATE::GAFITask": { ar: "إضافة مهمة مؤسسية", en: "Added Corporate Task" },
  "UPDATE::GAFITask": { ar: "تحديث مهمة مؤسسية", en: "Updated Corporate Task" },
  "DELETE::GAFITask": { ar: "حذف مهمة مؤسسية", en: "Deleted Corporate Task" },
  "UPDATE_STATUS::GAFITask": { ar: "تحديث حالة مهمة مؤسسية", en: "Updated GAFI Task Status" },
  "GENERATE_MINUTES::GAFITask": { ar: "إنشاء مسودة محضر الجمعية", en: "Generated GAFI Minutes" },
  "CREATE::SubsidiaryCompany": { ar: "إضافة شركة تابعة", en: "Added Subsidiary" },
  "UPDATE::SubsidiaryCompany": { ar: "تحديث شركة تابعة", en: "Updated Subsidiary" },
  "DELETE::SubsidiaryCompany": { ar: "حذف شركة تابعة", en: "Deleted Subsidiary" },
  "CREATE::AssemblyArchive": { ar: "إضافة محضر جمعية", en: "Added Assembly Record" },
  "UPDATE::AssemblyArchive": { ar: "تحديث محضر جمعية", en: "Updated Assembly Record" },
  "DELETE::AssemblyArchive": { ar: "حذف محضر جمعية", en: "Deleted Assembly Record" },

  // Court sessions
  "CREATE::CourtSession": { ar: "جدولة جلسة محكمة", en: "Scheduled Court Session" },
  "SESSION_OUTCOME::CourtSession": { ar: "تسجيل نتيجة جلسة", en: "Logged Session Outcome" },

  // Prosecutions
  "CREATE::Prosecution": { ar: "إضافة محضر / جنحة", en: "Added Prosecution" },
  "UPDATE::Prosecution": { ar: "تحديث محضر", en: "Updated Prosecution" },
  "DELETE::Prosecution": { ar: "حذف محضر", en: "Deleted Prosecution" },
  "UPDATE_STATUS::Prosecution": { ar: "تحديث حالة محضر", en: "Updated Prosecution Status" },
  "SEND_MISSION::Prosecution": { ar: "إرسال مأمورية نيابة", en: "Sent Prosecution Mission" },
  "GENERATE_REPORT::Prosecution": { ar: "إنشاء عريضة شيك", en: "Generated Bounced Check Report" },
  "ARCHIVE_REPORT::Prosecution": { ar: "أرشفة تقرير نيابة", en: "Archived Prosecution Report" },

  // Legal tasks & POA
  "CREATE::LegalTask": { ar: "تكليف بمهمة قانونية", en: "Assigned Legal Task" },
  "UPDATE::LegalTask": { ar: "تحديث مهمة قانونية", en: "Updated Legal Task" },
  "DELETE::LegalTask": { ar: "حذف مهمة قانونية", en: "Deleted Legal Task" },
  "UPDATE_STATUS::LegalTask": { ar: "تحديث حالة مهمة قانونية", en: "Updated Legal Task Status" },
  "CREATE::PowerOfAttorney": { ar: "إضافة توكيل", en: "Added Power of Attorney" },
  "UPDATE::PowerOfAttorney": { ar: "تحديث توكيل", en: "Updated Power of Attorney" },
  "DELETE::PowerOfAttorney": { ar: "حذف توكيل", en: "Deleted Power of Attorney" },

  // Notices
  "CREATE::LegalNotice": { ar: "إضافة إخطار قانوني", en: "Added Legal Notice" },
  "UPDATE::LegalNotice": { ar: "تحديث إخطار قانوني", en: "Updated Legal Notice" },
  "DELETE::LegalNotice": { ar: "حذف إخطار قانوني", en: "Deleted Legal Notice" },
  "UPDATE_DELIVERY::LegalNotice": { ar: "تحديث حالة تسليم إخطار", en: "Updated Notice Delivery" },

  // Expenses
  "CREATE::Expense": { ar: "تقديم مصروف", en: "Submitted Expense" },
  "UPDATE::Expense": { ar: "تحديث مصروف", en: "Updated Expense" },
  "DELETE::Expense": { ar: "حذف مصروف", en: "Deleted Expense" },
  "APPROVE::Expense": { ar: "اعتماد مصروف", en: "Approved Expense" },
  "REJECT::Expense": { ar: "رفض مصروف", en: "Rejected Expense" },
  "REIMBURSE::Expense": { ar: "صرف مصروف", en: "Reimbursed Expense" },

  // Library
  "UPLOAD::LegalDocument": { ar: "رفع مستند للمكتبة", en: "Uploaded Library Document" },
  "UPDATE::LegalDocument": { ar: "تحديث مستند", en: "Updated Document" },
  "DELETE::LegalDocument": { ar: "حذف مستند", en: "Deleted Document" },

  // Executions
  "CREATE::ExecutionRequest": { ar: "إنشاء طلب تنفيذ", en: "Created Execution Request" },

  // User admin
  "CREATE_USER::User": { ar: "إنشاء مستخدم", en: "Created User" },
  "UPDATE_USER::User": { ar: "تحديث مستخدم", en: "Updated User" },
  "UPDATE::User": { ar: "تحديث ملف مستخدم", en: "Updated User Profile" },
  "DEACTIVATE_USER::User": { ar: "تعطيل مستخدم", en: "Deactivated User" },
  "ACTIVATE_USER::User": { ar: "تفعيل مستخدم", en: "Activated User" },
  "ENABLE_USER_2FA::User": { ar: "تفعيل المصادقة الثنائية", en: "Enabled 2FA for User" },
  "DISABLE_USER_2FA::User": { ar: "تعطيل المصادقة الثنائية", en: "Disabled 2FA for User" },
  "DELETE_USER::User": { ar: "حذف مستخدم", en: "Deleted User" },
  "CHANGE_INITIAL_PASSWORD::User": { ar: "تغيير كلمة المرور الأولية", en: "Changed Initial Password" },

  // Backups
  "CREATE_BACKUP::BackupLog": { ar: "إنشاء نسخة احتياطية", en: "Created Backup" },
  "CREATE_ENCRYPTED_BACKUP::BackupLog": { ar: "إنشاء نسخة احتياطية مشفرة", en: "Created Encrypted Backup" },
  "DELETE_BACKUP::BackupLog": { ar: "حذف نسخة احتياطية", en: "Deleted Backup" },
  "CLEANUP_BACKUPS::BackupLog": { ar: "تنظيف النسخ الاحتياطية", en: "Cleaned Up Old Backups" },
  "IMPORT_BACKUP::BackupLog": { ar: "استيراد نسخة احتياطية", en: "Imported Backup" },

  // Lookups & settings
  "CREATE_LOOKUP::CourtLookup": { ar: "إضافة محكمة", en: "Added Court Lookup" },
  "UPDATE_LOOKUP::CourtLookup": { ar: "تحديث محكمة", en: "Updated Court Lookup" },
  "DELETE_LOOKUP::CourtLookup": { ar: "حذف محكمة", en: "Deleted Court Lookup" },
  "CREATE_LOOKUP::PoliceStationLookup": { ar: "إضافة قسم شرطة", en: "Added Police Station" },
  "UPDATE_LOOKUP::PoliceStationLookup": { ar: "تحديث قسم شرطة", en: "Updated Police Station" },
  "DELETE_LOOKUP::PoliceStationLookup": { ar: "حذف قسم شرطة", en: "Deleted Police Station" },
  "CREATE_LOOKUP::ExpertOfficeLookup": { ar: "إضافة مكتب خبير", en: "Added Expert Office" },
  "UPDATE_LOOKUP::ExpertOfficeLookup": { ar: "تحديث مكتب خبير", en: "Updated Expert Office" },
  "DELETE_LOOKUP::ExpertOfficeLookup": { ar: "حذف مكتب خبير", en: "Deleted Expert Office" },
  "CREATE_LOOKUP::Project": { ar: "إضافة مشروع", en: "Added Project" },
  "UPDATE_LOOKUP::Project": { ar: "تحديث مشروع", en: "Updated Project" },
  "DELETE_LOOKUP::Project": { ar: "حذف مشروع", en: "Deleted Project" },

  // System
  "BROADCAST::System": { ar: "إرسال رسالة جماعية", en: "Sent System Broadcast" },
};

function labelKey(action: string, entityName: string): string {
  return `${action}::${entityName}`;
}

function fallbackLabel(action: string, entityName: string): Label {
  const entity = entityLabels[entityName] ?? { ar: entityName, en: entityName };
  const verbs: Record<string, Label> = {
    CREATE: { ar: `إضافة ${entity.ar}`, en: `Created ${entity.en}` },
    UPDATE: { ar: `تحديث ${entity.ar}`, en: `Updated ${entity.en}` },
    DELETE: { ar: `حذف ${entity.ar}`, en: `Deleted ${entity.en}` },
    UPLOAD: { ar: `رفع ${entity.ar}`, en: `Uploaded ${entity.en}` },
  };
  if (verbs[action]) return verbs[action];

  const readable = action.replace(/_/g, " ").toLowerCase();
  return {
    ar: `${readable} — ${entity.ar}`,
    en: `${readable.replace(/\b\w/g, (c) => c.toUpperCase())} — ${entity.en}`,
  };
}

function resolveLabel(action: string, entityName: string): Label {
  return (
    actionLabels[labelKey(action, entityName)] ??
    actionLabels[labelKey(action, "*")] ??
    fallbackLabel(action, entityName)
  );
}

export function getAuditActionLabel(
  action: string,
  entityName: string,
  locale: string
): string {
  const label = resolveLabel(action, entityName);
  return locale === "ar" ? label.ar : label.en;
}

export async function resolveAuditTargetDetails(
  entityName: string,
  entityId: string
): Promise<string> {
  try {
    switch (entityName) {
      case "User": {
        const user = await prisma.user.findUnique({
          where: { id: entityId },
          select: { name: true, email: true, role: true },
        });
        if (!user) return entityId;
        return `${user.name} — ${user.email} (${user.role})`;
      }
      case "BackupLog": {
        const backup = await prisma.backupLog.findUnique({
          where: { id: entityId },
          select: { fileName: true, type: true, createdAt: true },
        });
        if (!backup) return entityId;
        return `${backup.fileName} (${backup.type})`;
      }
      case "Lawsuit": {
        if (/^\d+$/.test(entityId)) {
          return `Bulk import — ${entityId} lawsuits`;
        }
        const lawsuit = await prisma.lawsuit.findUnique({
          where: { id: entityId },
          select: { caseNumber: true, year: true, courtName: true, opponentName: true },
        });
        if (!lawsuit) return entityId;
        return `Case ${lawsuit.caseNumber}/${lawsuit.year} — ${lawsuit.courtName} — ${lawsuit.opponentName}`;
      }
      case "Contract": {
        if (entityId === "intake") return "Contract analysis — intake draft";
        const contract = await prisma.contract.findUnique({
          where: { id: entityId },
          include: { project: { select: { name: true } } },
        });
        if (!contract) return entityId;
        return `${contract.contractorName} — ${contract.project.name}`;
      }
      case "GAFITask": {
        const task = await prisma.gAFITask.findUnique({
          where: { id: entityId },
          select: { title: true, taskType: true },
        });
        if (!task) return entityId;
        return `${task.title} (${task.taskType})`;
      }
      case "CourtSession": {
        const session = await prisma.courtSession.findUnique({
          where: { id: entityId },
          include: {
            lawsuit: {
              select: { caseNumber: true, year: true, courtName: true },
            },
          },
        });
        if (!session) return entityId;
        return `Session — Case ${session.lawsuit.caseNumber}/${session.lawsuit.year} — ${session.lawsuit.courtName}`;
      }
      case "Prosecution": {
        if (entityId.length < 20 && !entityId.includes("-")) {
          return `Grouped mission — ${entityId}`;
        }
        const prosecution = await prisma.prosecution.findUnique({
          where: { id: entityId },
          select: {
            caseNumber: true,
            year: true,
            policeStation: true,
            clientName: true,
          },
        });
        if (!prosecution) return entityId;
        return `Report ${prosecution.caseNumber}/${prosecution.year} — ${prosecution.policeStation} — ${prosecution.clientName}`;
      }
      case "LegalTask": {
        const task = await prisma.legalTask.findUnique({
          where: { id: entityId },
          select: { title: true, deadline: true },
        });
        if (!task) return entityId;
        return task.title;
      }
      case "LegalNotice": {
        const notice = await prisma.legalNotice.findUnique({
          where: { id: entityId },
          select: { opponentName: true, noticeType: true, noticeNumber: true },
        });
        if (!notice) return entityId;
        return `${notice.opponentName} — ${notice.noticeType}${notice.noticeNumber ? ` #${notice.noticeNumber}` : ""}`;
      }
      case "Expense": {
        const expense = await prisma.expense.findUnique({
          where: { id: entityId },
          select: { amount: true, description: true, status: true },
        });
        if (!expense) return entityId;
        return `${expense.amount.toLocaleString()} EGP — ${expense.description} (${expense.status})`;
      }
      case "LegalDocument": {
        const doc = await prisma.legalDocument.findUnique({
          where: { id: entityId },
          select: { title: true, category: true },
        });
        if (!doc) return entityId;
        return `${doc.title} (${doc.category})`;
      }
      case "PowerOfAttorney": {
        const poa = await prisma.powerOfAttorney.findUnique({
          where: { id: entityId },
          select: { poaNumber: true, clientName: true },
        });
        if (!poa) return entityId;
        return `POA ${poa.poaNumber} — ${poa.clientName}`;
      }
      case "SubsidiaryCompany": {
        const company = await prisma.subsidiaryCompany.findUnique({
          where: { id: entityId },
          select: { name: true },
        });
        if (!company) return entityId;
        return company.name;
      }
      case "AssemblyArchive": {
        const archive = await prisma.assemblyArchive.findUnique({
          where: { id: entityId },
          select: { type: true, dateHeld: true },
        });
        if (!archive) return entityId;
        return `${archive.type} — ${archive.dateHeld.toISOString().slice(0, 10)}`;
      }
      case "ExecutionRequest": {
        const request = await prisma.executionRequest.findUnique({
          where: { id: entityId },
          select: { status: true, lawsuit: { select: { caseNumber: true, year: true } } },
        });
        if (!request) return entityId;
        return `Case ${request.lawsuit.caseNumber}/${request.lawsuit.year} (${request.status})`;
      }
      case "System":
        return entityId;
      case "CourtLookup": {
        const row = await prisma.courtLookup.findUnique({ where: { id: entityId }, select: { name: true } });
        return row?.name ?? entityId;
      }
      case "PoliceStationLookup": {
        const row = await prisma.policeStationLookup.findUnique({ where: { id: entityId }, select: { name: true } });
        return row?.name ?? entityId;
      }
      case "ExpertOfficeLookup": {
        const row = await prisma.expertOfficeLookup.findUnique({ where: { id: entityId }, select: { name: true } });
        return row?.name ?? entityId;
      }
      case "Project": {
        const row = await prisma.project.findUnique({ where: { id: entityId }, select: { name: true } });
        return row?.name ?? entityId;
      }
      default:
        return `${entityName} · ${entityId}`;
    }
  } catch {
    return `${entityName} · ${entityId}`;
  }
}

export async function enrichAuditLogs<
  T extends {
    action: string;
    entityName: string;
    entityId: string;
  },
>(logs: T[], locale: string): Promise<(T & { actionLabel: string; targetDetails: string })[]> {
  return Promise.all(
    logs.map(async (log) => ({
      ...log,
      actionLabel: getAuditActionLabel(log.action, log.entityName, locale),
      targetDetails: await resolveAuditTargetDetails(log.entityName, log.entityId),
    }))
  );
}
