"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ProsecutionsGrouped, type ProsecutionItem } from "./ProsecutionsGrouped";
import {
  CreateProsecutionDialog,
  type LawyerOption,
  type ProsecutionFormInitialData,
} from "./CreateProsecutionDialog";
import { deleteProsecution } from "@/app/actions/prosecutionCrud";

export function ProsecutionsModule({
  grouped,
  lawyers,
  policeStationLookups,
  canManage,
  canEdit,
  canDelete,
}: {
  grouped: Record<string, ProsecutionItem[]>;
  lawyers: LawyerOption[];
  policeStationLookups: { id: string; name: string }[];
  canManage: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const tCommon = useTranslations("common");
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProsecutionFormInitialData | null>(null);

  const handleEdit = (item: ProsecutionItem) => {
    setEditItem({
      id: item.id,
      caseNumber: item.caseNumber,
      reportNumber: item.reportNumber ?? undefined,
      year: item.year,
      policeStation: item.policeStation,
      clientName: item.clientName,
      issueType: item.issueType as ProsecutionFormInitialData["issueType"],
      assignedLawyerId: item.assignedLawyerId,
    });
    setEditOpen(true);
  };

  return (
    <>
      <ProsecutionsGrouped
        grouped={grouped}
        canManage={canManage}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={handleEdit}
        onDelete={(id) => deleteProsecution(id)}
        deleteSuccessMessage={tCommon("deleteSuccess")}
        deleteErrorMessage={tCommon("deleteFailed")}
      />
      <CreateProsecutionDialog
        lawyers={lawyers}
        policeStationLookups={policeStationLookups}
        canCreate={false}
        initialData={editItem}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditItem(null);
        }}
        hideTrigger
      />
    </>
  );
}
