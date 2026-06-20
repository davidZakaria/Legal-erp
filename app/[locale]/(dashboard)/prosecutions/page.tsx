import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageProsecutions } from "@/lib/rbac";
import { Role } from "@prisma/client";
import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProsecutionsGrouped } from "@/components/prosecutions/ProsecutionsGrouped";
import { CreateProsecutionDialog } from "@/components/prosecutions/CreateProsecutionDialog";

export default async function ProsecutionsPage() {
  const t = await getTranslations("prosecutions");
  const session = await auth();

  const [prosecutions, lawyers] = await Promise.all([
    prisma.prosecution.findMany({
      include: { assignedLawyer: true },
      orderBy: [{ policeStation: "asc" }, { year: "desc" }],
    }),
    prisma.user.findMany({
      where: { role: Role.LAWYER },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const grouped = prosecutions.reduce(
    (acc, p) => {
      if (!acc[p.policeStation]) acc[p.policeStation] = [];
      acc[p.policeStation].push({
        id: p.id,
        caseNumber: p.caseNumber,
        year: p.year,
        clientName: p.clientName,
        issueType: p.issueType,
        status: p.status,
        lawyerName: p.assignedLawyer.name,
      });
      return acc;
    },
    {} as Record<
      string,
      Array<{
        id: string;
        caseNumber: string;
        year: number;
        clientName: string;
        issueType: string;
        status: string;
        lawyerName: string;
      }>
    >
  );

  const canManage = session?.user
    ? canManageProsecutions(session.user.role)
    : false;

  return (
    <div>
      <PageHeader
        title={t("title")}
        icon={ShieldAlert}
        action={
          <CreateProsecutionDialog lawyers={lawyers} canCreate={canManage} />
        }
      />
      <ProsecutionsGrouped grouped={grouped} canManage={canManage} />
    </div>
  );
}
