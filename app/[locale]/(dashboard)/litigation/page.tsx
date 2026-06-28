import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateLawsuit, isManagerOrAbove } from "@/lib/rbac";
import { hasPermission } from "@/lib/permissions";
import { getAllLookups } from "@/lib/lookups";
import { Role } from "@prisma/client";
import { Scale } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LitigationModule } from "@/components/litigation/LitigationModule";
import { CreateLawsuitDialog } from "@/components/litigation/CreateLawsuitDialog";
import { ImportLawsuitsDialog } from "@/components/litigation/ImportLawsuitsDialog";
import { TriggerWhatsAppRemindersButton } from "@/components/litigation/TriggerWhatsAppRemindersButton";
import { buildLawsuitWhere } from "@/lib/litigation/buildLawsuitWhere";
import { SESSION_TYPE_COURT } from "@/lib/litigation/constants";
import type { LawsuitFilters } from "@/lib/litigation/constants";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    court?: string;
    year?: string;
  }>;
};

export default async function LitigationPage({ searchParams }: PageProps) {
  const t = await getTranslations("litigation");
  const locale = await getLocale();
  const session = await auth();
  const params = await searchParams;

  const filters: LawsuitFilters = {
    q: params.q,
    status: params.status,
    court: params.court,
    year: params.year,
  };

  if (
    session?.user &&
    !(await hasPermission(session.user.id, "LAWSUITS_READ", session.user.role))
  ) {
    redirect({ href: "/", locale });
  }

  const where = buildLawsuitWhere(filters);

  const [lawsuits, lawyers, courtRows, yearRows, lookups] = await Promise.all([
    prisma.lawsuit.findMany({
      where,
      include: {
        assignedLawyer: true,
        courtSessions: { orderBy: { sessionDate: "asc" } },
      },
      orderBy: [{ year: "desc" }, { caseNumber: "asc" }],
    }),
    prisma.user.findMany({
      where: { role: Role.LAWYER },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.lawsuit.findMany({
      select: { courtName: true },
      distinct: ["courtName"],
      orderBy: { courtName: "asc" },
    }),
    prisma.lawsuit.findMany({
      select: { year: true },
      distinct: ["year"],
      orderBy: { year: "desc" },
    }),
    getAllLookups(),
  ]);

  const lawsuitIds = lawsuits.map((l) => l.id);
  const linkedNotices =
    lawsuitIds.length > 0
      ? await prisma.legalNotice.findMany({
          where: { lawsuitId: { in: lawsuitIds } },
          orderBy: { submissionDate: "desc" },
        })
      : [];

  const preliminaryNoticeByLawsuitId = new Map<
    string,
    (typeof linkedNotices)[number]
  >();
  for (const notice of linkedNotices) {
    if (notice.lawsuitId && !preliminaryNoticeByLawsuitId.has(notice.lawsuitId)) {
      preliminaryNoticeByLawsuitId.set(notice.lawsuitId, notice);
    }
  }

  const data = lawsuits.map((l) => {
    const notice = preliminaryNoticeByLawsuitId.get(l.id);
    return {
    id: l.id,
    caseNumber: l.caseNumber,
    year: l.year,
    courtName: l.courtName,
    opponentName: l.opponentName,
    clientName: l.clientName,
    archiveNumber: l.archiveNumber,
    registrationDate: l.registrationDate.toISOString(),
    overallStatus: l.overallStatus,
    isAtExperts: l.isAtExperts,
    expertOffice: l.expertOffice,
    expertName: l.expertName,
    expertFileNumber: l.expertFileNumber,
    awardedCompensation: l.awardedCompensation ?? 0,
    judicialFees: l.judicialFees ?? 0,
    assignedLawyerId: l.assignedLawyerId,
    lawyerName: l.assignedLawyer.name,
    sessions: l.courtSessions
      .filter((s) => s.sessionType === SESSION_TYPE_COURT)
      .map((s) => ({
      id: s.id,
      sessionDate: s.sessionDate.toISOString(),
      requiredAction: s.requiredAction,
      status: s.status,
      sessionOutcome: s.sessionOutcome,
    })),
    preliminaryNotice: notice
      ? {
          id: notice.id,
          noticeNumber: notice.noticeNumber,
          year: notice.year,
          noticeType: notice.noticeType,
          bailiffOffice: notice.bailiffOffice,
          opponentName: notice.opponentName,
          submissionDate: notice.submissionDate.toISOString(),
          deliveryStatus: notice.deliveryStatus,
          deliveryDate: notice.deliveryDate?.toISOString() ?? null,
        }
      : null,
  };
  });

  const courts = Array.from(
    new Set([
      ...lookups.courts.map((c) => c.name),
      ...courtRows.map((row) => row.courtName),
    ])
  ).sort((a, b) => a.localeCompare(b, "ar"));
  const years = yearRows.map((row) => row.year);

  const user = session!.user;
  const canCreate =
    (await hasPermission(user.id, "LAWSUITS_CREATE", user.role)) ||
    canCreateLawsuit(user.role);
  const canEdit = await hasPermission(user.id, "LAWSUITS_UPDATE", user.role);
  const canDelete = await hasPermission(user.id, "LAWSUITS_DELETE", user.role);
  const canTriggerWhatsApp = isManagerOrAbove(user.role);

  return (
    <div>
      <PageHeader
        title={t("title")}
        icon={Scale}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <TriggerWhatsAppRemindersButton canTrigger={canTriggerWhatsApp} />
            <ImportLawsuitsDialog canImport={canCreate} />
            <CreateLawsuitDialog
              lawyers={lawyers}
              courtLookups={lookups.courts}
              expertOfficeLookups={lookups.expertOffices}
              canCreate={canCreate}
            />
          </div>
        }
      />
      <LitigationModule
        lawsuits={data}
        filters={filters}
        courts={courts}
        years={years}
        lawyers={lawyers}
        courtLookups={lookups.courts}
        expertOfficeLookups={lookups.expertOffices}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
}
