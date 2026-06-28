import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { getPoliceStationLookups } from "@/lib/lookups";
import { ShieldAlert } from "lucide-react";
import { Role } from "@prisma/client";
import { PageHeader } from "@/components/layout/PageHeader";
import type { ProsecutionItem } from "@/components/prosecutions/ProsecutionsGrouped";
import { ProsecutionsModule } from "@/components/prosecutions/ProsecutionsModule";
import { CreateProsecutionDialog } from "@/components/prosecutions/CreateProsecutionDialog";

export default async function ProsecutionsPage() {
  const t = await getTranslations("prosecutions");
  const locale = await getLocale();
  const session = await auth();

  if (
    session?.user &&
    !(await hasPermission(session.user.id, "PROSECUTIONS_READ", session.user.role))
  ) {
    redirect({ href: "/", locale });
  }

  const [prosecutions, lawyers, policeStationLookups] = await Promise.all([
    prisma.prosecution.findMany({
      include: { assignedLawyer: true },
      orderBy: [{ policeStation: "asc" }, { year: "desc" }],
    }),
    prisma.user.findMany({
      where: { role: Role.LAWYER, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getPoliceStationLookups(),
  ]);

  const grouped = prosecutions.reduce(
    (acc, p) => {
      if (!acc[p.policeStation]) acc[p.policeStation] = [];
      acc[p.policeStation].push({
        id: p.id,
        caseNumber: p.caseNumber,
        reportNumber: p.reportNumber,
        year: p.year,
        policeStation: p.policeStation,
        clientName: p.clientName,
        issueType: p.issueType,
        status: p.status,
        lawyerName: p.assignedLawyer.name,
        assignedLawyerId: p.assignedLawyerId,
      });
      return acc;
    },
    {} as Record<string, ProsecutionItem[]>
  );

  const user = session!.user;
  const canCreate = await hasPermission(user.id, "PROSECUTIONS_CREATE", user.role);
  const canEdit = await hasPermission(user.id, "PROSECUTIONS_UPDATE", user.role);
  const canDelete = await hasPermission(user.id, "PROSECUTIONS_DELETE", user.role);
  const canManage = canCreate || canEdit;

  return (
    <div>
      <PageHeader
        title={t("title")}
        icon={ShieldAlert}
        action={
          <CreateProsecutionDialog
            lawyers={lawyers}
            policeStationLookups={policeStationLookups}
            canCreate={canCreate}
          />
        }
      />
      <ProsecutionsModule
        grouped={grouped}
        lawyers={lawyers}
        policeStationLookups={policeStationLookups}
        canManage={canManage}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
}
