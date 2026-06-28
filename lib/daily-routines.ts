import { addDays, endOfDay, startOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { CourtSessionStatus, LegalNoticeDeliveryStatus, LegalTaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildTomorrowAgendaBodyHtml,
  sendLawyerTomorrowAgendaEmail,
} from "@/lib/notifications/assignment-matrix";
import {
  getManagerEmails,
  sendCriticalAlertEmail,
  sendOverdueBailiffNoticeReminder,
} from "@/lib/email";

const CAIRO_TZ = "Africa/Cairo";

function getTomorrowRangeInCairo(): { start: Date; end: Date } {
  const nowInCairo = toZonedTime(new Date(), CAIRO_TZ);
  const tomorrowInCairo = addDays(nowInCairo, 1);
  const start = fromZonedTime(startOfDay(tomorrowInCairo), CAIRO_TZ);
  const end = fromZonedTime(endOfDay(tomorrowInCairo), CAIRO_TZ);
  return { start, end };
}

export async function processLawyerTomorrowAgenda() {
  const { start, end } = getTomorrowRangeInCairo();

  const [sessions, tasks] = await Promise.all([
    prisma.courtSession.findMany({
      where: {
        sessionDate: { gte: start, lte: end },
        status: CourtSessionStatus.PENDING,
        isReminderSent: false,
      },
      include: {
        lawsuit: {
          include: { assignedLawyer: true },
        },
      },
    }),
    prisma.legalTask.findMany({
      where: {
        deadline: { gte: start, lte: end },
        status: LegalTaskStatus.PENDING,
      },
      include: { assignedLawyer: true },
    }),
  ]);

  const byLawyer = new Map<
    string,
    {
      lawyer: { id: string; name: string; email: string | null };
      sessions: typeof sessions;
      tasks: typeof tasks;
    }
  >();

  for (const session of sessions) {
    const lawyer = session.lawsuit.assignedLawyer;
    const entry = byLawyer.get(lawyer.id) ?? { lawyer, sessions: [], tasks: [] };
    entry.sessions.push(session);
    byLawyer.set(lawyer.id, entry);
  }

  for (const task of tasks) {
    const lawyer = task.assignedLawyer;
    const entry = byLawyer.get(lawyer.id) ?? { lawyer, sessions: [], tasks: [] };
    entry.tasks.push(task);
    byLawyer.set(lawyer.id, entry);
  }

  const results: Array<{
    lawyerId: string;
    lawyerName: string;
    email: string | null;
    sessionCount: number;
    taskCount: number;
    success: boolean;
    message: string;
  }> = [];

  for (const { lawyer, sessions: lawyerSessions, tasks: lawyerTasks } of byLawyer.values()) {
    if (!lawyer.email) {
      results.push({
        lawyerId: lawyer.id,
        lawyerName: lawyer.name,
        email: null,
        sessionCount: lawyerSessions.length,
        taskCount: lawyerTasks.length,
        success: false,
        message: "Lawyer has no email address",
      });
      continue;
    }

    const bodyHtml = buildTomorrowAgendaBodyHtml(
      lawyer.name,
      lawyerSessions.map((session) => ({
        caseNumber: session.lawsuit.caseNumber,
        year: session.lawsuit.year,
        courtName: session.lawsuit.courtName,
        requiredAction: session.requiredAction,
      })),
      lawyerTasks.map((task) => ({
        title: task.title,
        description: task.description,
      }))
    );

    const sendResult = await sendLawyerTomorrowAgendaEmail(lawyer.email, lawyer.name, bodyHtml);

    if (sendResult.success && lawyerSessions.length > 0) {
      await prisma.courtSession.updateMany({
        where: { id: { in: lawyerSessions.map((session) => session.id) } },
        data: { isReminderSent: true },
      });
    }

    results.push({
      lawyerId: lawyer.id,
      lawyerName: lawyer.name,
      email: lawyer.email,
      sessionCount: lawyerSessions.length,
      taskCount: lawyerTasks.length,
      success: sendResult.success,
      message: sendResult.message,
    });
  }

  return {
    sent: results.filter((result) => result.success).length,
    totalLawyers: byLawyer.size,
    totalSessions: sessions.length,
    totalTasks: tasks.length,
    results,
  };
}

/** @deprecated Use processLawyerTomorrowAgenda */
export async function processDailySessionReminders() {
  const agenda = await processLawyerTomorrowAgenda();
  return {
    sent: agenda.sent,
    total: agenda.totalSessions,
    results: agenda.results.map((result) => ({
      sessionIds: [] as string[],
      lawyerName: result.lawyerName,
      email: result.email,
      success: result.success,
      message: result.message,
    })),
  };
}

export async function processManagerRiskRadar() {
  const now = new Date();
  const in30Days = addDays(now, 30);
  const in45Days = addDays(now, 45);

  const [expiringContracts, subsidiaries] = await Promise.all([
    prisma.contract.findMany({
      where: {
        status: "ACTIVE",
        guaranteeExpiryDate: { gte: now, lte: in30Days },
      },
      include: { project: { select: { name: true } } },
      orderBy: { guaranteeExpiryDate: "asc" },
    }),
    prisma.subsidiaryCompany.findMany({
      where: {
        OR: [
          { crExpiryDate: { gte: now, lte: in45Days } },
          { taxCardExpiryDate: { gte: now, lte: in45Days } },
          { boardExpiryDate: { gte: now, lte: in45Days } },
        ],
      },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!expiringContracts.length && !subsidiaries.length) {
    return {
      sent: false,
      totalContracts: 0,
      totalCompanies: 0,
      message: "No expiring guarantees or corporate records found",
    };
  }

  const managerEmails = await getManagerEmails();

  const contractItems = expiringContracts
    .map(
      (contract) =>
        `<li style="margin-bottom: 10px;">
          <strong>عقد — ${contract.project.name}</strong> — ${contract.contractorName}<br />
          انتهاء الضمان: ${contract.guaranteeExpiryDate.toLocaleDateString("ar-EG")} —
          ${contract.totalValue.toString()} ج.م
        </li>`
    )
    .join("");

  const subsidiaryItems = subsidiaries
    .map((company) => {
      const expiring: string[] = [];
      if (
        company.crExpiryDate &&
        company.crExpiryDate >= now &&
        company.crExpiryDate <= in45Days
      ) {
        expiring.push(
          `السجل التجاري — ينتهي ${company.crExpiryDate.toLocaleDateString("ar-EG")}`
        );
      }
      if (
        company.taxCardExpiryDate &&
        company.taxCardExpiryDate >= now &&
        company.taxCardExpiryDate <= in45Days
      ) {
        expiring.push(
          `البطاقة الضريبية — تنتهي ${company.taxCardExpiryDate.toLocaleDateString("ar-EG")}`
        );
      }
      if (
        company.boardExpiryDate &&
        company.boardExpiryDate >= now &&
        company.boardExpiryDate <= in45Days
      ) {
        expiring.push(
          `مجلس الإدارة — ينتهي ${company.boardExpiryDate.toLocaleDateString("ar-EG")}`
        );
      }
      if (!expiring.length) return "";
      return `<li style="margin-bottom: 12px;">
        <strong>${company.name}</strong>
        <ul style="margin: 6px 0 0; padding-right: 20px;">${expiring.map((item) => `<li>${item}</li>`).join("")}</ul>
      </li>`;
    })
    .filter(Boolean)
    .join("");

  const alertTitle = "🚨 تقرير المخاطر: ضمانات وسجلات تقترب من الانتهاء";
  const details = `
    ${expiringContracts.length ? `<p style="margin: 0 0 12px; font-weight: bold;">ضمانات عقود (${expiringContracts.length}) — خلال 30 يوماً:</p><ul style="margin: 0 0 20px; padding-right: 24px;">${contractItems}</ul>` : ""}
    ${subsidiaryItems ? `<p style="margin: 0 0 12px; font-weight: bold;">سجلات شركات تابعة (${subsidiaries.length}) — خلال 45 يوماً:</p><ul style="margin: 0; padding-right: 24px;">${subsidiaryItems}</ul>` : ""}
  `;

  const sendResult = await sendCriticalAlertEmail(managerEmails, alertTitle, details);

  return {
    sent: sendResult.success,
    totalContracts: expiringContracts.length,
    totalCompanies: subsidiaries.length,
    message: sendResult.message,
  };
}

/** @deprecated Use processManagerRiskRadar */
export async function processGuaranteeExpiryAlerts() {
  const radar = await processManagerRiskRadar();
  return {
    sent: radar.sent,
    total: radar.totalContracts,
    contracts: [] as string[],
    message: radar.message,
  };
}

/** @deprecated Use processManagerRiskRadar */
export async function processCorporateGovernanceAlerts() {
  const radar = await processManagerRiskRadar();
  return {
    sent: radar.sent,
    total: radar.totalCompanies,
    companies: [] as string[],
    message: radar.message,
  };
}

export async function processOverdueBailiffNoticeReminders() {
  const todayEnd = endOfDay(new Date());

  const notices = await prisma.legalNotice.findMany({
    where: {
      deliveryStatus: LegalNoticeDeliveryStatus.PENDING,
      followUpDate: { not: null, lte: todayEnd },
    },
    include: {
      assignedLawyer: { select: { id: true, name: true, email: true } },
    },
    orderBy: { followUpDate: "asc" },
  });

  const results: Array<{
    noticeId: string;
    lawyerName: string;
    email: string | null;
    success: boolean;
    message: string;
  }> = [];

  for (const notice of notices) {
    const lawyer = notice.assignedLawyer;

    if (!lawyer.email) {
      results.push({
        noticeId: notice.id,
        lawyerName: lawyer.name,
        email: null,
        success: false,
        message: "Lawyer has no email address",
      });
      continue;
    }

    const sendResult = await sendOverdueBailiffNoticeReminder(
      lawyer.email,
      lawyer.name,
      notice.bailiffOffice,
      notice.opponentName
    );

    results.push({
      noticeId: notice.id,
      lawyerName: lawyer.name,
      email: lawyer.email,
      success: sendResult.success,
      message: sendResult.message,
    });
  }

  return {
    sent: results.filter((result) => result.success).length,
    total: notices.length,
    results,
  };
}

export async function runDailyRoutines() {
  const [agenda, riskRadar, bailiffNotices] = await Promise.all([
    processLawyerTomorrowAgenda(),
    processManagerRiskRadar(),
    processOverdueBailiffNoticeReminders(),
  ]);

  return {
    agenda,
    riskRadar,
    bailiffNotices,
    // Legacy shape for existing consumers
    reminders: {
      sent: agenda.sent,
      total: agenda.totalSessions,
    },
    guarantees: {
      sent: riskRadar.sent,
      total: riskRadar.totalContracts,
      message: riskRadar.message,
    },
    corporate: {
      sent: riskRadar.sent,
      total: riskRadar.totalCompanies,
      message: riskRadar.message,
    },
  };
}
