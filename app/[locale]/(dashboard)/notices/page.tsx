import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { canCreateLawsuit } from "@/lib/rbac";
import { getAllLookups } from "@/lib/lookups";
import { FileWarning } from "lucide-react";
import { Role } from "@prisma/client";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  CreateLegalNoticeDialog,
  type ContractOption,
  type LawsuitOption,
} from "@/components/notices/CreateLegalNoticeDialog";
import { NoticesModule } from "@/components/notices/NoticesModule";
import type { LegalNoticeRow } from "@/components/notices/NoticesDataTable";

export default async function NoticesPage() {
  const t = await getTranslations("notices");
  const locale = await getLocale();
  const session = await auth();

  if (
    session?.user &&
    !(await hasPermission(session.user.id, "NOTICES_READ", session.user.role))
  ) {
    redirect({ href: "/", locale });
  }

  const [notices, lawyers, contracts, lawsuits, lookups] = await Promise.all([
    prisma.legalNotice.findMany({
      include: { assignedLawyer: { select: { id: true, name: true } } },
      orderBy: [{ followUpDate: "asc" }, { submissionDate: "desc" }],
    }),
    prisma.user.findMany({
      where: { role: Role.LAWYER, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.contract.findMany({
      include: { project: { select: { name: true } } },
      orderBy: { contractorName: "asc" },
    }),
    prisma.lawsuit.findMany({
      orderBy: [{ year: "desc" }, { caseNumber: "asc" }],
      take: 200,
    }),
    getAllLookups(),
  ]);

  const rows: LegalNoticeRow[] = notices.map((notice) => ({
    id: notice.id,
    noticeNumber: notice.noticeNumber,
    year: notice.year,
    bailiffOffice: notice.bailiffOffice,
    clientName: notice.clientName,
    opponentName: notice.opponentName,
    noticeType: notice.noticeType,
    submissionDate: notice.submissionDate.toISOString(),
    deliveryStatus: notice.deliveryStatus,
    deliveryDate: notice.deliveryDate?.toISOString() ?? null,
    followUpDate: notice.followUpDate?.toISOString() ?? null,
    assignedLawyerId: notice.assignedLawyerId,
    lawyerName: notice.assignedLawyer.name,
    contractId: notice.contractId,
    lawsuitId: notice.lawsuitId,
    notes: notice.notes,
  }));

  const contractOptions: ContractOption[] = contracts.map((contract) => ({
    id: contract.id,
    label: `${contract.contractorName} — ${contract.project.name}`,
  }));

  const lawsuitOptions: LawsuitOption[] = lawsuits.map((lawsuit) => ({
    id: lawsuit.id,
    label: `${lawsuit.caseNumber} / ${lawsuit.year} — ${lawsuit.opponentName}`,
  }));

  const user = session!.user;
  const canCreate = await hasPermission(user.id, "NOTICES_CREATE", user.role);
  const canEdit = await hasPermission(user.id, "NOTICES_UPDATE", user.role);
  const canDelete = await hasPermission(user.id, "NOTICES_DELETE", user.role);
  const canEscalateToLawsuit =
    (await hasPermission(user.id, "LAWSUITS_CREATE", user.role)) ||
    canCreateLawsuit(user.role);

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={FileWarning}
        action={
          <CreateLegalNoticeDialog
            lawyers={lawyers}
            contracts={contractOptions}
            lawsuits={lawsuitOptions}
            canCreate={canCreate}
          />
        }
      />
      <NoticesModule
        notices={rows}
        lawyers={lawyers}
        contracts={contractOptions}
        lawsuits={lawsuitOptions}
        courtLookups={lookups.courts}
        expertOfficeLookups={lookups.expertOffices}
        currentUserId={user.id}
        canEdit={canEdit}
        canDelete={canDelete}
        canEscalateToLawsuit={canEscalateToLawsuit}
      />
    </div>
  );
}
