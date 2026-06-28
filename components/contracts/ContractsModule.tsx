"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ContractsDataTable, type ContractRow } from "./ContractsDataTable";
import { CreateContractDialog,
  type ContractFormInitialData,
  type ProjectOption,
} from "./CreateContractDialog";
import { deleteContract } from "@/app/actions/contractCrud";
import type { LinkedNoticeSummary } from "@/components/notices/ContractLinkedNoticesSection";

export function ContractsModule({
  data,
  projects,
  linkedNoticesByContractId,
  canUpdate,
  canDelete,
}: {
  data: ContractRow[];
  projects: ProjectOption[];
  linkedNoticesByContractId: Record<string, LinkedNoticeSummary[]>;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const tCommon = useTranslations("common");
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<ContractFormInitialData | null>(null);

  const handleEdit = (row: ContractRow) => {
    setEditItem({
      id: row.id,
      projectId: row.projectId,
      contractorName: row.contractorName,
      totalValue: Number(row.totalValue),
      penaltyClause: row.penaltyClause,
      guaranteeExpiryDate: row.guaranteeExpiryDate,
    });
    setEditOpen(true);
  };

  return (
    <>
      <ContractsDataTable
        data={data}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onEdit={handleEdit}
        onDelete={(id) => deleteContract(id)}
        deleteSuccessMessage={tCommon("deleteSuccess")}
        deleteErrorMessage={tCommon("deleteFailed")}
      />
      <CreateContractDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditItem(null);
        }}
        projects={projects}
        prefill={null}
        uploadedFile={null}
        initialData={editItem}
        linkedNotices={editItem ? linkedNoticesByContractId[editItem.id] ?? [] : []}
      />
    </>
  );
}
