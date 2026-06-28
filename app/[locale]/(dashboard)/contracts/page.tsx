import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { FileSignature } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContractsModule } from "@/components/contracts/ContractsModule";
import { ContractsPageActions } from "@/components/contracts/ContractsPageActions";

export default async function ContractsPage() {
  const t = await getTranslations("contracts");
  const locale = await getLocale();
  const session = await auth();

  if (
    session?.user &&
    !(await hasPermission(session.user.id, "CONTRACTS_READ", session.user.role))
  ) {
    redirect({ href: "/", locale });
  }

  const [contracts, projects, contractNotices] = await Promise.all([
    prisma.contract.findMany({
      include: { project: true },
      orderBy: { guaranteeExpiryDate: "asc" },
    }),
    prisma.project.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.legalNotice.findMany({
      where: { contractId: { not: null } },
      orderBy: { submissionDate: "desc" },
    }),
  ]);

  const linkedNoticesByContractId = contractNotices.reduce<
    Record<string, typeof contractNotices>
  >((acc, notice) => {
    if (!notice.contractId) return acc;
    if (!acc[notice.contractId]) acc[notice.contractId] = [];
    acc[notice.contractId].push(notice);
    return acc;
  }, {});

  const linkedNoticesForModule = Object.fromEntries(
    Object.entries(linkedNoticesByContractId).map(([contractId, notices]) => [
      contractId,
      notices.map((notice) => ({
        id: notice.id,
        noticeNumber: notice.noticeNumber,
        year: notice.year,
        noticeType: notice.noticeType,
        opponentName: notice.opponentName,
        submissionDate: notice.submissionDate.toISOString(),
        deliveryStatus: notice.deliveryStatus,
      })),
    ])
  );

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
  const canCreate = await hasPermission(user.id, "CONTRACTS_CREATE", user.role);
  const canUpdate = await hasPermission(user.id, "CONTRACTS_UPDATE", user.role);
  const canDelete = await hasPermission(user.id, "CONTRACTS_DELETE", user.role);

  return (
    <div>
      <PageHeader
        title={t("title")}
        icon={FileSignature}
        action={<ContractsPageActions projects={projectOptions} canCreate={canCreate} />}
      />
      <ContractsModule
        data={data}
        projects={projectOptions}
        linkedNoticesByContractId={linkedNoticesForModule}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
