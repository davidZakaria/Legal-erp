import { startOfDay, endOfDay, isBefore } from "date-fns";
import {
  CourtSessionStatus,
  ExpenseStatus,
  LegalNoticeDeliveryStatus,
  LegalTaskStatus,
  Role,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isManagerRole } from "@/lib/permissions";

export type InAppNotificationType =
  | "session"
  | "legalTask"
  | "gafiTask"
  | "notice"
  | "expense";

export type InAppNotification = {
  id: string;
  type: InAppNotificationType;
  title: string;
  subtitle: string;
  href: string;
  urgent: boolean;
  at: string;
};

function isRelevantDate(date: Date, now: Date, includeUpcomingForManagers: boolean): boolean {
  if (isBefore(date, startOfDay(now))) return true;
  if (date >= startOfDay(now) && date <= endOfDay(now)) return true;
  if (includeUpcomingForManagers) {
    const inSevenDays = new Date(now);
    inSevenDays.setDate(inSevenDays.getDate() + 7);
    return date <= endOfDay(inSevenDays);
  }
  return false;
}

export async function getInAppNotifications(
  userId: string,
  role: Role
): Promise<InAppNotification[]> {
  const now = new Date();
  const isManager = isManagerRole(role);
  const items: InAppNotification[] = [];

  const lawyerFilter = isManager ? {} : { assignedLawyerId: userId };

  const [sessions, legalTasks, gafiTasks, notices, pendingExpenses] = await Promise.all([
    prisma.courtSession.findMany({
      where: {
        status: CourtSessionStatus.PENDING,
        ...(isManager ? {} : { lawsuit: { assignedLawyerId: userId } }),
      },
      include: {
        lawsuit: { select: { caseNumber: true, year: true } },
      },
      orderBy: { sessionDate: "asc" },
      take: 25,
    }),
    prisma.legalTask.findMany({
      where: {
        status: LegalTaskStatus.PENDING,
        ...lawyerFilter,
      },
      orderBy: { deadline: "asc" },
      take: 25,
    }),
    isManager
      ? prisma.gAFITask.findMany({
          where: { status: "PENDING" },
          orderBy: { deadline: "asc" },
          take: 15,
        })
      : Promise.resolve([]),
    prisma.legalNotice.findMany({
      where: {
        ...lawyerFilter,
        OR: [
          { deliveryStatus: LegalNoticeDeliveryStatus.PENDING },
          {
            followUpDate: { lte: now },
            deliveryStatus: {
              in: [
                LegalNoticeDeliveryStatus.PENDING,
                LegalNoticeDeliveryStatus.NOT_FOUND,
                LegalNoticeDeliveryStatus.DELIVERED_REFUSED,
              ],
            },
          },
        ],
      },
      orderBy: { submissionDate: "desc" },
      take: 15,
    }),
    isManager
      ? prisma.expense.findMany({
          where: { status: ExpenseStatus.PENDING_APPROVAL },
          include: { requestedBy: { select: { name: true } } },
          orderBy: { date: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  for (const session of sessions) {
    if (!isRelevantDate(session.sessionDate, now, isManager)) continue;
    const urgent = isBefore(session.sessionDate, startOfDay(now));
    items.push({
      id: `session-${session.id}`,
      type: "session",
      title: `Case ${session.lawsuit.caseNumber}/${session.lawsuit.year}`,
      subtitle: session.requiredAction,
      href: "/litigation",
      urgent,
      at: session.sessionDate.toISOString(),
    });
  }

  for (const task of legalTasks) {
    if (!isRelevantDate(task.deadline, now, isManager)) continue;
    const urgent = isBefore(task.deadline, startOfDay(now));
    items.push({
      id: `legalTask-${task.id}`,
      type: "legalTask",
      title: task.title,
      subtitle: task.description ?? "",
      href: "/",
      urgent,
      at: task.deadline.toISOString(),
    });
  }

  for (const task of gafiTasks) {
    if (!isRelevantDate(task.deadline, now, true)) continue;
    const urgent = isBefore(task.deadline, startOfDay(now));
    items.push({
      id: `gafi-${task.id}`,
      type: "gafiTask",
      title: task.title,
      subtitle: task.taskType,
      href: "/gafi",
      urgent,
      at: task.deadline.toISOString(),
    });
  }

  for (const notice of notices) {
    const followUpOverdue =
      notice.followUpDate && isBefore(notice.followUpDate, startOfDay(now));
    const urgent = Boolean(followUpOverdue);
    items.push({
      id: `notice-${notice.id}`,
      type: "notice",
      title: notice.opponentName,
      subtitle: notice.noticeType,
      href: "/notices",
      urgent,
      at: (notice.followUpDate ?? notice.submissionDate).toISOString(),
    });
  }

  for (const expense of pendingExpenses) {
    items.push({
      id: `expense-${expense.id}`,
      type: "expense",
      title: `${expense.amount.toLocaleString()} EGP`,
      subtitle: expense.requestedBy.name,
      href: "/expenses",
      urgent: true,
      at: expense.date.toISOString(),
    });
  }

  return items
    .sort((a, b) => {
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
      return new Date(a.at).getTime() - new Date(b.at).getTime();
    })
    .slice(0, 20);
}
