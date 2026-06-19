import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-start">{t("title")}</h1>
      <ProsecutionsGrouped grouped={grouped} />
    </div>
  );
}
