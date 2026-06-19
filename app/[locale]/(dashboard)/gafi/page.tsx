import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageGafiTasks } from "@/lib/rbac";
import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { GafiTable } from "@/components/gafi/GafiTable";
import { CreateGafiTaskDialog } from "@/components/gafi/CreateGafiTaskDialog";

export default async function GafiPage() {
  const t = await getTranslations("gafi");
  const session = await auth();

  const tasks = await prisma.gAFITask.findMany({
    orderBy: { deadline: "asc" },
  });

  const data = tasks.map((task) => ({
    id: task.id,
    taskType: task.taskType,
    title: task.title,
    deadline: task.deadline.toISOString(),
    status: task.status,
  }));

  const canManage = session?.user
    ? canManageGafiTasks(session.user.role)
    : false;

  return (
    <div>
      <PageHeader
        title={t("title")}
        icon={Building2}
        action={<CreateGafiTaskDialog canCreate={canManage} />}
      />
      <GafiTable tasks={data} canManage={canManage} />
    </div>
  );
}
