import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateLawsuit, isManagerOrAbove } from "@/lib/rbac";
import { Role } from "@prisma/client";
import { Scale } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LitigationView } from "@/components/litigation/LitigationView";
import { CreateLawsuitDialog } from "@/components/litigation/CreateLawsuitDialog";
import { ImportLawsuitsDialog } from "@/components/litigation/ImportLawsuitsDialog";
import { TriggerWhatsAppRemindersButton } from "@/components/litigation/TriggerWhatsAppRemindersButton";

export default async function LitigationPage() {
  const t = await getTranslations("litigation");
  const session = await auth();

  const [lawsuits, lawyers] = await Promise.all([
    prisma.lawsuit.findMany({
      include: {
        assignedLawyer: true,
        courtSessions: { orderBy: { sessionDate: "asc" } },
      },
      orderBy: { year: "desc" },
    }),
    prisma.user.findMany({
      where: { role: Role.LAWYER },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

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

  const canCreate = session?.user
    ? canCreateLawsuit(session.user.role)
    : false;

  const canTriggerWhatsApp = session?.user
    ? isManagerOrAbove(session.user.role)
    : false;

  return (
    <div>
      <PageHeader
        title={t("title")}
        icon={Scale}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <TriggerWhatsAppRemindersButton canTrigger={canTriggerWhatsApp} />
            <ImportLawsuitsDialog canImport={canCreate} />
            <CreateLawsuitDialog lawyers={lawyers} canCreate={canCreate} />
          </div>
        }
      />
      <LitigationView lawsuits={data} />
    </div>
  );
}
