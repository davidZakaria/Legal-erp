import { addDays, endOfDay, startOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { CourtSessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildReminderMessage, sendWhatsAppMessage } from "@/lib/whatsapp";

const CAIRO_TZ = "Africa/Cairo";

function getTomorrowRangeInCairo(): { start: Date; end: Date } {
  const nowInCairo = toZonedTime(new Date(), CAIRO_TZ);
  const tomorrowInCairo = addDays(nowInCairo, 1);
  const start = fromZonedTime(startOfDay(tomorrowInCairo), CAIRO_TZ);
  const end = fromZonedTime(endOfDay(tomorrowInCairo), CAIRO_TZ);
  return { start, end };
}

export async function processCourtSessionReminders() {
  const { start, end } = getTomorrowRangeInCairo();

  const sessions = await prisma.courtSession.findMany({
    where: {
      sessionDate: { gte: start, lte: end },
      status: CourtSessionStatus.PENDING,
      isReminderSent: false,
    },
    include: {
      lawsuit: {
        include: {
          assignedLawyer: true,
        },
      },
    },
  });

  const results: Array<{
    sessionId: string;
    lawyerName: string;
    phone: string | null;
    success: boolean;
    message: string;
  }> = [];

  for (const session of sessions) {
    const lawyer = session.lawsuit.assignedLawyer;
    const text = buildReminderMessage({
      lawyerName: lawyer.name,
      caseNumber: session.lawsuit.caseNumber,
      year: session.lawsuit.year,
      courtName: session.lawsuit.courtName,
      requiredAction: session.requiredAction,
    });

    if (!lawyer.phone) {
      results.push({
        sessionId: session.id,
        lawyerName: lawyer.name,
        phone: null,
        success: false,
        message: "Lawyer has no phone number",
      });
      continue;
    }

    const sendResult = await sendWhatsAppMessage(lawyer.phone, text);

    if (sendResult.success) {
      await prisma.courtSession.update({
        where: { id: session.id },
        data: { isReminderSent: true },
      });
    }

    results.push({
      sessionId: session.id,
      lawyerName: lawyer.name,
      phone: lawyer.phone,
      success: sendResult.success,
      message: sendResult.message,
    });
  }

  return {
    sent: results.filter((r) => r.success).length,
    total: sessions.length,
    results,
  };
}
