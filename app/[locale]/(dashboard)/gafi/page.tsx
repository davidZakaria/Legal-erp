import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { GafiModuleTabs } from "@/components/gafi/GafiModuleTabs";

export default async function GafiPage() {
  const t = await getTranslations("gafi");
  const locale = await getLocale();
  const session = await auth();

  if (
    session?.user &&
    !(await hasPermission(session.user.id, "GAFI_READ", session.user.role))
  ) {
    redirect({ href: "/", locale });
  }

  const [companies, archives, tasks] = await Promise.all([
    prisma.subsidiaryCompany.findMany({ orderBy: { name: "asc" } }),
    prisma.assemblyArchive.findMany({
      include: { company: { select: { name: true } } },
      orderBy: { dateHeld: "desc" },
    }),
    prisma.gAFITask.findMany({ orderBy: { deadline: "asc" } }),
  ]);

  const companyRows = companies.map((company) => ({
    id: company.id,
    name: company.name,
    commercialRegister: company.commercialRegister,
    crExpiryDate: company.crExpiryDate?.toISOString() ?? null,
    taxCard: company.taxCard,
    taxCardExpiryDate: company.taxCardExpiryDate?.toISOString() ?? null,
    boardExpiryDate: company.boardExpiryDate?.toISOString() ?? null,
    capitalPaidDetails: company.capitalPaidDetails,
  }));

  const archiveRows = archives.map((archive) => ({
    id: archive.id,
    companyId: archive.companyId,
    companyName: archive.company.name,
    type: archive.type,
    dateHeld: archive.dateHeld.toISOString(),
    fileUrl: archive.fileUrl,
  }));

  const taskRows = tasks.map((task) => ({
    id: task.id,
    taskType: task.taskType,
    title: task.title,
    deadline: task.deadline.toISOString(),
    status: task.status,
  }));

  const user = session!.user;
  const canCreate = await hasPermission(user.id, "GAFI_CREATE", user.role);
  const canEdit = await hasPermission(user.id, "GAFI_UPDATE", user.role);
  const canManage = canCreate || canEdit;

  return (
    <div>
      <PageHeader title={t("title")} icon={Building2} />
      <GafiModuleTabs
        companies={companyRows}
        archives={archiveRows}
        tasks={taskRows}
        canManage={canManage}
      />
    </div>
  );
}
