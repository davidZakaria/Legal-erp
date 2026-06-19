import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { ContractsDataTable } from "@/components/contracts/ContractsDataTable";

export default async function ContractsPage() {
  const t = await getTranslations("contracts");

  const contracts = await prisma.contract.findMany({
    include: { project: true },
    orderBy: { guaranteeExpiryDate: "asc" },
  });

  const data = contracts.map((c) => ({
    id: c.id,
    contractorName: c.contractorName,
    projectName: c.project.name,
    projectLocation: c.project.location,
    totalValue: c.totalValue.toString(),
    guaranteeExpiryDate: c.guaranteeExpiryDate.toISOString(),
    penaltyClause: c.penaltyClause,
    status: c.status,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-start">{t("title")}</h1>
      <ContractsDataTable data={data} />
    </div>
  );
}
