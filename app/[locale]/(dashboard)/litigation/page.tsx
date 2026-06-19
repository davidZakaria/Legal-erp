import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { LitigationView } from "@/components/litigation/LitigationView";

export default async function LitigationPage() {
  const t = await getTranslations("litigation");

  const lawsuits = await prisma.lawsuit.findMany({
    include: {
      assignedLawyer: true,
      courtSessions: { orderBy: { sessionDate: "asc" } },
    },
    orderBy: { year: "desc" },
  });

  const data = lawsuits.map((l) => ({
    id: l.id,
    caseNumber: l.caseNumber,
    year: l.year,
    courtName: l.courtName,
    opponentName: l.opponentName,
    lawyerName: l.assignedLawyer.name,
    sessions: l.courtSessions.map((s) => ({
      id: s.id,
      sessionDate: s.sessionDate.toISOString(),
      requiredAction: s.requiredAction,
      status: s.status,
      sessionOutcome: s.sessionOutcome,
    })),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-start">{t("title")}</h1>
      <LitigationView lawsuits={data} />
    </div>
  );
}
