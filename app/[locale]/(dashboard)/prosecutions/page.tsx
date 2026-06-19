import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProsecutionsGrouped } from "@/components/prosecutions/ProsecutionsGrouped";

export default async function ProsecutionsPage() {
  const t = await getTranslations("prosecutions");

  const prosecutions = await prisma.prosecution.findMany({
    include: { assignedLawyer: true },
    orderBy: [{ policeStation: "asc" }, { year: "desc" }],
  });

  const grouped = prosecutions.reduce(
    (acc, p) => {
      if (!acc[p.policeStation]) acc[p.policeStation] = [];
      acc[p.policeStation].push({
        id: p.id,
        caseNumber: p.caseNumber,
        year: p.year,
        clientName: p.clientName,
        issueType: p.issueType,
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
        lawyerName: string;
      }>
    >
  );

  return (
    <div>
      <PageHeader title={t("title")} icon={ShieldAlert} />
      <ProsecutionsGrouped grouped={grouped} />
    </div>
  );
}
