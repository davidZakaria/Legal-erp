import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  isBefore,
} from "date-fns";
import { prisma } from "@/lib/prisma";
import { CourtSessionStatus } from "@prisma/client";

export type AgendaItemType = "session" | "gafi" | "legalTask";

export type AgendaItem = {
  id: string;
  type: AgendaItemType;
  date: Date;
  title: string;
  subtitle: string;
  lawyerName: string;
  lawyerInitials: string;
  overdue: boolean;
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export async function fetchAgendaItems(): Promise<AgendaItem[]> {
  const now = new Date();

  const [sessions, gafiTasks, legalTasks] = await Promise.all([
    prisma.courtSession.findMany({
      where: { status: CourtSessionStatus.PENDING },
      include: {
        lawsuit: {
          include: { assignedLawyer: { select: { name: true } } },
        },
      },
      orderBy: { sessionDate: "asc" },
    }),
    prisma.gAFITask.findMany({
      where: { status: "PENDING" },
      orderBy: { deadline: "asc" },
    }),
    prisma.legalTask.findMany({
      where: { status: "PENDING" },
      include: { assignedLawyer: { select: { name: true } } },
      orderBy: { deadline: "asc" },
    }),
  ]);

  const items: AgendaItem[] = [];

  for (const session of sessions) {
    const lawyerName = session.lawsuit.assignedLawyer.name;
    items.push({
      id: session.id,
      type: "session",
      date: session.sessionDate,
      title: `جلسة قضية ${session.lawsuit.caseNumber}/${session.lawsuit.year}`,
      subtitle: session.requiredAction,
      lawyerName,
      lawyerInitials: initials(lawyerName),
      overdue: isBefore(session.sessionDate, now),
    });
  }

  for (const task of gafiTasks) {
    items.push({
      id: task.id,
      type: "gafi",
      date: task.deadline,
      title: task.title,
      subtitle: task.taskType,
      lawyerName: "NJD",
      lawyerInitials: "NJ",
      overdue: isBefore(task.deadline, now),
    });
  }

  for (const task of legalTasks) {
    const lawyerName = task.assignedLawyer.name;
    items.push({
      id: task.id,
      type: "legalTask",
      date: task.deadline,
      title: task.title,
      subtitle: task.description ?? "",
      lawyerName,
      lawyerInitials: initials(lawyerName),
      overdue: isBefore(task.deadline, now),
    });
  }

  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function filterAgendaForToday(items: AgendaItem[], now = new Date()): AgendaItem[] {
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  return items.filter(
    (item) =>
      item.overdue ||
      isWithinInterval(item.date, { start: dayStart, end: dayEnd })
  );
}

export function filterAgendaForWeek(items: AgendaItem[], now = new Date()): AgendaItem[] {
  const weekStart = startOfWeek(now, { weekStartsOn: 6 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 6 });

  return items.filter(
    (item) =>
      item.overdue ||
      isWithinInterval(item.date, { start: weekStart, end: weekEnd })
  );
}

export async function countOverdueItems(now = new Date()): Promise<number> {
  const items = await fetchAgendaItems();
  return items.filter((item) => item.overdue).length;
}
