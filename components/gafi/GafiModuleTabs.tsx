"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GafiTable, type GafiTaskRow } from "./GafiTable";
import {
  SubsidiaryRegistryTable,
  type SubsidiaryCompanyRow,
} from "./SubsidiaryRegistryTable";
import {
  AssemblyArchivePanel,
  type AssemblyArchiveRow,
} from "./AssemblyArchivePanel";
import { CreateGafiTaskDialog } from "./CreateGafiTaskDialog";
import {
  CreateSubsidiaryDialog,
  type SubsidiaryFormInitialData,
} from "./CreateSubsidiaryDialog";
import {
  CreateAssemblyArchiveDialog,
  type AssemblyArchiveFormInitialData,
} from "./CreateAssemblyArchiveDialog";

export function GafiModuleTabs({
  companies,
  archives,
  tasks,
  canCreate,
  canUpdate,
  canDelete,
}: {
  companies: SubsidiaryCompanyRow[];
  archives: AssemblyArchiveRow[];
  tasks: GafiTaskRow[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("gafi");

  const [editingCompany, setEditingCompany] = useState<SubsidiaryFormInitialData | null>(
    null
  );
  const [companyEditOpen, setCompanyEditOpen] = useState(false);

  const [editingArchive, setEditingArchive] = useState<AssemblyArchiveFormInitialData | null>(
    null
  );
  const [archiveEditOpen, setArchiveEditOpen] = useState(false);

  return (
    <>
      <Tabs defaultValue="registries" className="w-full">
        <TabsList className="w-full justify-start sm:w-auto">
          <TabsTrigger value="registries">{t("tabRegistries")}</TabsTrigger>
          <TabsTrigger value="assemblies">{t("tabAssemblies")}</TabsTrigger>
          <TabsTrigger value="tasks">{t("tabTasks")}</TabsTrigger>
        </TabsList>

        <TabsContent value="registries">
          <SubsidiaryRegistryTable
            companies={companies}
            canCreate={canCreate}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={(company) => {
              setEditingCompany(company);
              setCompanyEditOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="assemblies">
          <AssemblyArchivePanel
            archives={archives}
            companies={companies}
            canCreate={canCreate}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={(archive) => {
              setEditingArchive({
                id: archive.id,
                companyId: archive.companyId,
                type: archive.type as AssemblyArchiveFormInitialData["type"],
                dateHeld: archive.dateHeld,
              });
              setArchiveEditOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="tasks">
          {canCreate && (
            <div className="mb-4 flex justify-end">
              <CreateGafiTaskDialog canCreate={canCreate} />
            </div>
          )}
          <GafiTable
            tasks={tasks}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        </TabsContent>
      </Tabs>

      {canUpdate && editingCompany && (
        <CreateSubsidiaryDialog
          canCreate={canCreate}
          canUpdate={canUpdate}
          initialData={editingCompany}
          open={companyEditOpen}
          onOpenChange={(open) => {
            setCompanyEditOpen(open);
            if (!open) setEditingCompany(null);
          }}
          hideTrigger
        />
      )}

      {canUpdate && editingArchive && (
        <CreateAssemblyArchiveDialog
          canCreate={canCreate}
          canUpdate={canUpdate}
          companies={companies}
          initialData={editingArchive}
          open={archiveEditOpen}
          onOpenChange={(open) => {
            setArchiveEditOpen(open);
            if (!open) setEditingArchive(null);
          }}
          hideTrigger
        />
      )}
    </>
  );
}
