import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateLawsuit } from "@/lib/rbac";
import { SESSION_TYPE_EXPERT } from "@/lib/litigation/constants";
import { Briefcase } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExpertsDataTable } from "@/components/experts/ExpertsDataTable";

export default async function ExpertsPage() {
  const t = await getTranslations("experts");
  const session = await auth();

  const lawsuits = await prisma.lawsuit.findMany({
    where: { isAtExperts: true },
    include: {
      assignedLawyer: true,
      courtSessions: {
        where: { sessionType: SESSION_TYPE_EXPERT },
        orderBy: { sessionDate: "desc" },
      },
    },
    orderBy: [{ year: "desc" }, { caseNumber: "asc" }],
  });

  const data = lawsuits.map((lawsuit) => ({
    id: lawsuit.id,
    caseNumber: lawsuit.caseNumber,
    year: lawsuit.year,
    courtName: lawsuit.courtName,
    clientName: lawsuit.clientName,
    expertOffice: lawsuit.expertOffice,
    expertName: lawsuit.expertName,
    expertFileNumber: lawsuit.expertFileNumber,
    judicialFees: lawsuit.judicialFees ?? 0,
    awardedCompensation: lawsuit.awardedCompensation ?? 0,
    lawyerName: lawsuit.assignedLawyer.name,
    expertSessions: lawsuit.courtSessions.map((s) => ({
      id: s.id,
      sessionDate: s.sessionDate.toISOString(),
      requiredAction: s.requiredAction,
      status: s.status,
      sessionOutcome: s.sessionOutcome,
    })),
  }));

  const canManage = session?.user ? canCreateLawsuit(session.user.role) : false;

  return (
    <div>
      <PageHeader title={t("title")} icon={Briefcase} />
      <p className="mb-6 text-sm text-slate-600">{t("description")}</p>
      <ExpertsDataTable lawsuits={data} canManage={canManage} />
    </div>
  );
}
