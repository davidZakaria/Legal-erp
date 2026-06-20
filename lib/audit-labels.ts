import { prisma } from "@/lib/prisma";

type AuditActionKey =
  | "CREATE_LAWSUIT"
  | "CREATE_CONTRACT"
  | "CREATE_GAFI_TASK"
  | "UPDATE_GAFI_STATUS"
  | "GENERATE_GAFI_MINUTES"
  | "ANALYZE_CONTRACT"
  | "DOWNLOAD_CONTRACT"
  | "SESSION_OUTCOME"
  | "CREATE_PROSECUTION"
  | "UPDATE_PROSECUTION_STATUS"
  | "SEND_PROSECUTION_MISSION"
  | "GENERATE_PROSECUTION_REPORT"
  | "BULK_IMPORT_LAWSUITS"
  | "UNKNOWN";

const actionLabels: Record<AuditActionKey, { ar: string; en: string }> = {
  CREATE_LAWSUIT: { ar: "إضافة دعوى جديدة", en: "Added New Lawsuit" },
  CREATE_CONTRACT: { ar: "إضافة عقد موقع", en: "Added Site Contract" },
  CREATE_GAFI_TASK: { ar: "إضافة مهمة مؤسسية", en: "Added Corporate Task" },
  UPDATE_GAFI_STATUS: { ar: "تحديث حالة مهمة مؤسسية", en: "Updated GAFI Task Status" },
  GENERATE_GAFI_MINUTES: {
    ar: "إنشاء مسودة محضر الجمعية",
    en: "Generated GAFI Minutes",
  },
  ANALYZE_CONTRACT: { ar: "تحليل عقد بالذكاء الاصطناعي", en: "Analyzed Contract (AI)" },
  DOWNLOAD_CONTRACT: { ar: "تحميل عقد", en: "Downloaded Contract" },
  SESSION_OUTCOME: { ar: "تسجيل نتيجة جلسة", en: "Logged Session Outcome" },
  CREATE_PROSECUTION: { ar: "إضافة محضر / جنحة", en: "Added Prosecution" },
  UPDATE_PROSECUTION_STATUS: { ar: "تحديث حالة محضر", en: "Updated Prosecution Status" },
  SEND_PROSECUTION_MISSION: { ar: "إرسال مأمورية نيابة", en: "Sent Prosecution Mission" },
  GENERATE_PROSECUTION_REPORT: { ar: "إنشاء عريضة شيك", en: "Generated Bounced Check Report" },
  BULK_IMPORT_LAWSUITS: { ar: "استيراد دعاوى جماعي", en: "Bulk Imported Lawsuits" },
  UNKNOWN: { ar: "إجراء غير معروف", en: "Unknown Action" },
};

function resolveActionKey(action: string, entityName: string): AuditActionKey {
  if (action === "CREATE" && entityName === "Lawsuit") return "CREATE_LAWSUIT";
  if (action === "CREATE" && entityName === "Contract") return "CREATE_CONTRACT";
  if (action === "CREATE" && entityName === "GAFITask") return "CREATE_GAFI_TASK";
  if (action === "UPDATE_STATUS" && entityName === "GAFITask") return "UPDATE_GAFI_STATUS";
  if (action === "GENERATE_MINUTES" && entityName === "GAFITask") {
    return "GENERATE_GAFI_MINUTES";
  }
  if (action === "ANALYZE_CONTRACT" && entityName === "Contract") return "ANALYZE_CONTRACT";
  if (action === "DOWNLOAD" && entityName === "Contract") return "DOWNLOAD_CONTRACT";
  if (action === "SESSION_OUTCOME" && entityName === "CourtSession") return "SESSION_OUTCOME";
  if (action === "CREATE" && entityName === "Prosecution") return "CREATE_PROSECUTION";
  if (action === "UPDATE_STATUS" && entityName === "Prosecution") return "UPDATE_PROSECUTION_STATUS";
  if (action === "SEND_MISSION" && entityName === "Prosecution") return "SEND_PROSECUTION_MISSION";
  if (action === "GENERATE_REPORT" && entityName === "Prosecution") return "GENERATE_PROSECUTION_REPORT";
  if (action === "BULK_IMPORT" && entityName === "Lawsuit") return "BULK_IMPORT_LAWSUITS";
  return "UNKNOWN";
}

export function getAuditActionLabel(
  action: string,
  entityName: string,
  locale: string
): string {
  const key = resolveActionKey(action, entityName);
  return locale === "ar" ? actionLabels[key].ar : actionLabels[key].en;
}

export async function resolveAuditTargetDetails(
  entityName: string,
  entityId: string
): Promise<string> {
  try {
    switch (entityName) {
      case "Lawsuit": {
        if (/^\d+$/.test(entityId)) {
          return `استيراد جماعي — ${entityId} دعوى`;
        }
        const lawsuit = await prisma.lawsuit.findUnique({
          where: { id: entityId },
          select: { caseNumber: true, year: true, courtName: true, opponentName: true },
        });
        if (!lawsuit) return entityId;
        return `قضية ${lawsuit.caseNumber}/${lawsuit.year} — ${lawsuit.courtName} — ${lawsuit.opponentName}`;
      }
      case "Contract": {
        if (entityId === "intake") return "تحليل عقد — مسودة إدخال";
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
        return `جلسة — قضية ${session.lawsuit.caseNumber}/${session.lawsuit.year} — ${session.lawsuit.courtName}`;
      }
      case "Prosecution": {
        if (entityId.length < 20 && !entityId.includes("-")) {
          return `مأمورية مجمعة — ${entityId}`;
        }
        const prosecution = await prisma.prosecution.findUnique({
          where: { id: entityId },
          select: {
            caseNumber: true,
            year: true,
            policeStation: true,
            clientName: true,
            issueType: true,
          },
        });
        if (!prosecution) return entityId;
        return `محضر ${prosecution.caseNumber}/${prosecution.year} — ${prosecution.policeStation} — ${prosecution.clientName}`;
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
