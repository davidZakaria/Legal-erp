import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { FileSignature } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContractsDataTable } from "@/components/contracts/ContractsDataTable";
import { ContractsPageActions } from "@/components/contracts/ContractsPageActions";

export default async function ContractsPage() {
  const t = await getTranslations("contracts");

  const [contracts, projects] = await Promise.all([
    prisma.contract.findMany({
      include: { project: true },
      orderBy: { guaranteeExpiryDate: "asc" },
    }),
    prisma.project.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

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

  const projectOptions = projects.map((project) => ({
    id: project.id,
    name: project.name,
    location: project.location,
  }));

  return (
    <div>
      <PageHeader
        title={t("title")}
        icon={FileSignature}
        action={<ContractsPageActions projects={projectOptions} />}
      />
      <ContractsDataTable data={data} />
    </div>
  );
}
