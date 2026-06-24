import { addDays, endOfDay, startOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { CourtSessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildSessionReminderBodyHtml,
  getManagerEmails,
  sendAssignmentEmail,
  sendCriticalAlertEmail,
} from "@/lib/email";

const CAIRO_TZ = "Africa/Cairo";

function getTomorrowRangeInCairo(): { start: Date; end: Date } {
  const nowInCairo = toZonedTime(new Date(), CAIRO_TZ);
  const tomorrowInCairo = addDays(nowInCairo, 1);
  const start = fromZonedTime(startOfDay(tomorrowInCairo), CAIRO_TZ);
  const end = fromZonedTime(endOfDay(tomorrowInCairo), CAIRO_TZ);
  return { start, end };
}

export async function processDailySessionReminders() {
  const { start, end } = getTomorrowRangeInCairo();

  const sessions = await prisma.courtSession.findMany({
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
  });

  const byLawyer = new Map<
    string,
    {
      lawyer: (typeof sessions)[0]["lawsuit"]["assignedLawyer"];
      sessions: typeof sessions;
    }
  >();

  for (const session of sessions) {
    const lawyer = session.lawsuit.assignedLawyer;
    const entry = byLawyer.get(lawyer.id) ?? { lawyer, sessions: [] };
    entry.sessions.push(session);
    byLawyer.set(lawyer.id, entry);
  }

  const results: Array<{
    sessionIds: string[];
    lawyerName: string;
    email: string | null;
    success: boolean;
    message: string;
  }> = [];

  for (const { lawyer, sessions: lawyerSessions } of byLawyer.values()) {
    const sessionIds = lawyerSessions.map((session) => session.id);

    if (!lawyer.email) {
      results.push({
        sessionIds,
        lawyerName: lawyer.name,
        email: null,
        success: false,
        message: "Lawyer has no email address",
      });
      continue;
    }

    const detailsHtml = buildSessionReminderBodyHtml(
      lawyer.name,
      lawyerSessions.map((session) => ({
        caseNumber: session.lawsuit.caseNumber,
        year: session.lawsuit.year,
        courtName: session.lawsuit.courtName,
        requiredAction: session.requiredAction,
      }))
    );

    const sendResult = await sendAssignmentEmail(
      lawyer.email,
      lawyer.name,
      "⚖️ تذكير بموعد جلسة غداً",
      `نذكّركم بمواعيد الجلسات التالية غداً:<br /><br />${detailsHtml}<br />برجاء الحضور وتأكيد (إثبات قرار المحكمة) على النظام فور الانتهاء.`,
      "⚖️ تذكير هام بموعد جلسة غداً"
    );

    if (sendResult.success) {
      await prisma.courtSession.updateMany({
        where: { id: { in: sessionIds } },
        data: { isReminderSent: true },
      });
    }

    results.push({
      sessionIds,
      lawyerName: lawyer.name,
      email: lawyer.email,
      success: sendResult.success,
      message: sendResult.message,
    });
  }

  return {
    sent: results.filter((result) => result.success).length,
    total: sessions.length,
    results,
  };
}

export async function processGuaranteeExpiryAlerts() {
  const now = new Date();
  const in30Days = addDays(now, 30);

  const expiringContracts = await prisma.contract.findMany({
    where: {
      status: "ACTIVE",
      guaranteeExpiryDate: { gte: now, lte: in30Days },
    },
    include: { project: { select: { name: true } } },
    orderBy: { guaranteeExpiryDate: "asc" },
  });

  if (!expiringContracts.length) {
    return {
      sent: false,
      total: 0,
      contracts: [] as string[],
      message: "No expiring guarantees found",
    };
  }

  const managerEmails = await getManagerEmails();
  const listItems = expiringContracts
    .map(
      (contract) =>
        `<li style="margin-bottom: 10px;">
          <strong>${contract.project.name}</strong> — ${contract.contractorName}<br />
          <strong>تاريخ انتهاء الضمان:</strong> ${contract.guaranteeExpiryDate.toLocaleDateString("ar-EG")}<br />
          <strong>قيمة العقد:</strong> ${contract.totalValue.toString()} جنيه
        </li>`
    )
    .join("");

  const alertTitle = "🚨 إنذار مالي: اقتراب انتهاء خطاب ضمان";
  const details = `
    <p style="margin: 0 0 16px;">يوجد <strong>${expiringContracts.length}</strong> عقد/عقود بخطابات ضمان تنتهي خلال 30 يوماً:</p>
    <ul style="margin: 0; padding-right: 24px;">${listItems}</ul>
  `;

  const sendResult = await sendCriticalAlertEmail(managerEmails, alertTitle, details);

  return {
    sent: sendResult.success,
    total: expiringContracts.length,
    contracts: expiringContracts.map((contract) => contract.id),
    message: sendResult.message,
  };
}

export async function runDailyRoutines() {
  const [reminders, guarantees] = await Promise.all([
    processDailySessionReminders(),
    processGuaranteeExpiryAlerts(),
  ]);

  return { reminders, guarantees };
}
