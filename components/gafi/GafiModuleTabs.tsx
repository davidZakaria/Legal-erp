"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GafiTable, type GafiTaskRow } from "./GafiTable";
import { SubsidiaryRegistryTable, type SubsidiaryCompanyRow } from "./SubsidiaryRegistryTable";
import { AssemblyArchivePanel, type AssemblyArchiveRow } from "./AssemblyArchivePanel";
import { CreateGafiTaskDialog } from "./CreateGafiTaskDialog";

export function GafiModuleTabs({
  companies,
  archives,
  tasks,
  canManage,
}: {
  companies: SubsidiaryCompanyRow[];
  archives: AssemblyArchiveRow[];
  tasks: GafiTaskRow[];
  canManage: boolean;
}) {
  const t = useTranslations("gafi");

  return (
    <Tabs defaultValue="registries" className="w-full">
      <TabsList className="w-full justify-start sm:w-auto">
        <TabsTrigger value="registries">{t("tabRegistries")}</TabsTrigger>
        <TabsTrigger value="assemblies">{t("tabAssemblies")}</TabsTrigger>
        <TabsTrigger value="tasks">{t("tabTasks")}</TabsTrigger>
      </TabsList>

      <TabsContent value="registries">
        <SubsidiaryRegistryTable companies={companies} canManage={canManage} />
      </TabsContent>

      <TabsContent value="assemblies">
        <AssemblyArchivePanel
          archives={archives}
          companies={companies}
          canManage={canManage}
        />
      </TabsContent>

      <TabsContent value="tasks">
        {canManage && (
          <div className="mb-4 flex justify-end">
            <CreateGafiTaskDialog canCreate={canManage} />
          </div>
        )}
        <GafiTable tasks={tasks} canManage={canManage} />
      </TabsContent>
    </Tabs>
  );
}
