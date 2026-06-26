import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUpdateOrDeleteRecords } from "@/lib/permissions";
import { FileSignature } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContractsModule } from "@/components/contracts/ContractsModule";
import { ContractsPageActions } from "@/components/contracts/ContractsPageActions";

export default async function ContractsPage() {
  const t = await getTranslations("contracts");
  const session = await auth();

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
    projectId: c.projectId,
    contractorName: c.contractorName,
    projectName: c.project.name,
    projectLocation: c.project.location,
    totalValue: c.totalValue.toString(),
    guaranteeExpiryDate: c.guaranteeExpiryDate.toISOString(),
    penaltyClause: c.penaltyClause,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
  }));

  const projectOptions = projects.map((project) => ({
    id: project.id,
    name: project.name,
    location: project.location,
  }));

  const user = session!.user;
  const canUpdate = canUpdateOrDeleteRecords(user.role);
  const canDelete = canUpdateOrDeleteRecords(user.role);

  return (
    <div>
      <PageHeader
        title={t("title")}
        icon={FileSignature}
        action={<ContractsPageActions projects={projectOptions} />}
      />
      <ContractsModule
        data={data}
        projects={projectOptions}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
