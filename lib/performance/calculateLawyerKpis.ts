import { CourtSessionStatus, LawsuitStatus, LegalTaskStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isBefore } from "date-fns";

export type LawyerKpi = {
  lawyerId: string;
  lawyerName: string;
  initials: string;
  activeLawsuits: number;
  overdueItems: number;
  completedItems: number;
  completionRate: number;
  lowPerformance: boolean;
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export async function calculateLawyerKpis(now = new Date()): Promise<LawyerKpi[]> {
  const lawyers = await prisma.user.findMany({
    where: { role: Role.LAWYER },
    orderBy: { name: "asc" },
  });

  const kpis: LawyerKpi[] = [];

  for (const lawyer of lawyers) {
    const [activeLawsuits, pendingSessions, completedSessions, pendingTasks, completedTasks] =
      await Promise.all([
        prisma.lawsuit.count({
          where: {
            assignedLawyerId: lawyer.id,
            overallStatus: { not: LawsuitStatus.COMPLETED },
          },
        }),
        prisma.courtSession.findMany({
          where: {
            status: CourtSessionStatus.PENDING,
            lawsuit: { assignedLawyerId: lawyer.id },
          },
          select: { sessionDate: true },
        }),
        prisma.courtSession.count({
          where: {
            status: CourtSessionStatus.COMPLETED,
            lawsuit: { assignedLawyerId: lawyer.id },
          },
        }),
        prisma.legalTask.findMany({
          where: {
            assignedLawyerId: lawyer.id,
            status: LegalTaskStatus.PENDING,
          },
          select: { deadline: true },
        }),
        prisma.legalTask.count({
          where: {
            assignedLawyerId: lawyer.id,
            status: LegalTaskStatus.COMPLETED,
          },
        }),
      ]);

    const overdueSessions = pendingSessions.filter((s) =>
      isBefore(s.sessionDate, now)
    ).length;
    const overdueTasks = pendingTasks.filter((t) => isBefore(t.deadline, now)).length;
    const overdueItems = overdueSessions + overdueTasks;

    const pendingNotOverdue =
      pendingSessions.length - overdueSessions + (pendingTasks.length - overdueTasks);
    const completedItems = completedSessions + completedTasks;
    const totalWorkItems = completedItems + pendingNotOverdue + overdueItems;
    const completionRate =
      totalWorkItems > 0 ? Math.round((completedItems / totalWorkItems) * 100) : 100;

    kpis.push({
      lawyerId: lawyer.id,
      lawyerName: lawyer.name,
      initials: initials(lawyer.name),
      activeLawsuits,
      overdueItems,
      completedItems,
      completionRate,
      lowPerformance: completionRate < 50,
    });
  }

  return kpis;
}
