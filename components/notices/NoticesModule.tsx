"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LegalNoticeDeliveryStatus } from "@prisma/client";
import {
  NoticesDataTable,
  type LegalNoticeRow,
} from "@/components/notices/NoticesDataTable";
import {
  CreateLegalNoticeDialog,
  type LawyerOption,
  type ContractOption,
  type LawsuitOption,
  type LegalNoticeFormInitialData,
} from "@/components/notices/CreateLegalNoticeDialog";
import { UpdateDeliveryDialog } from "@/components/notices/UpdateDeliveryDialog";
import {
  CreateLawsuitDialog,
  type LookupOption,
  type NoticeEscalationPrefill,
} from "@/components/litigation/CreateLawsuitDialog";
import { deleteLegalNotice } from "@/app/actions/legalNoticeCrud";

export function NoticesModule({
  notices,
  lawyers,
  contracts,
  lawsuits,
  courtLookups,
  expertOfficeLookups,
  currentUserId,
  canEdit,
  canDelete,
  canEscalateToLawsuit,
}: {
  notices: LegalNoticeRow[];
  lawyers: LawyerOption[];
  contracts: ContractOption[];
  lawsuits: LawsuitOption[];
  courtLookups: LookupOption[];
  expertOfficeLookups: LookupOption[];
  currentUserId: string;
  canEdit: boolean;
  canDelete: boolean;
  canEscalateToLawsuit: boolean;
}) {
  const tCommon = useTranslations("common");
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<LegalNoticeFormInitialData | null>(null);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [deliveryTarget, setDeliveryTarget] = useState<LegalNoticeRow | null>(null);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateNotice, setEscalateNotice] = useState<LegalNoticeRow | null>(null);

  const handleEdit = (row: LegalNoticeRow) => {
    setEditItem({
      id: row.id,
      noticeNumber: row.noticeNumber ?? undefined,
      year: row.year,
      bailiffOffice: row.bailiffOffice,
      clientName: row.clientName,
      opponentName: row.opponentName,
      noticeType: row.noticeType,
      submissionDate: new Date(row.submissionDate),
      followUpDate: row.followUpDate ? new Date(row.followUpDate) : undefined,
      deliveryDate: row.deliveryDate ? new Date(row.deliveryDate) : undefined,
      deliveryStatus: row.deliveryStatus as LegalNoticeDeliveryStatus,
      assignedLawyerId: row.assignedLawyerId,
      contractId: row.contractId ?? undefined,
      lawsuitId: row.lawsuitId ?? undefined,
      notes: row.notes ?? undefined,
    });
    setEditOpen(true);
  };

  const handleEscalate = (row: LegalNoticeRow) => {
    setEscalateNotice(row);
    setEscalateOpen(true);
  };

  const escalatePrefill: NoticeEscalationPrefill | null = escalateNotice
    ? {
        opponentName: escalateNotice.opponentName,
        clientName: escalateNotice.clientName,
        assignedLawyerId: escalateNotice.assignedLawyerId,
      }
    : null;

  const handleUpdateDelivery = (row: LegalNoticeRow) => {
    setDeliveryTarget(row);
    setDeliveryOpen(true);
  };

  return (
    <>
      <NoticesDataTable
        data={notices}
        currentUserId={currentUserId}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={handleEdit}
        onUpdateDelivery={handleUpdateDelivery}
        onEscalate={handleEscalate}
        canEscalateToLawsuit={canEscalateToLawsuit}
        onDelete={(id) => deleteLegalNotice(id)}
        deleteSuccessMessage={tCommon("deleteSuccess")}
        deleteErrorMessage={tCommon("deleteFailed")}
      />
      <CreateLegalNoticeDialog
        lawyers={lawyers}
        contracts={contracts}
        lawsuits={lawsuits}
        canCreate={false}
        initialData={editItem}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditItem(null);
        }}
        hideTrigger
      />
      <UpdateDeliveryDialog
        notice={deliveryTarget}
        open={deliveryOpen}
        onOpenChange={(open) => {
          setDeliveryOpen(open);
          if (!open) setDeliveryTarget(null);
        }}
      />
      {canEscalateToLawsuit && escalateNotice && (
        <CreateLawsuitDialog
          lawyers={lawyers}
          courtLookups={courtLookups}
          expertOfficeLookups={expertOfficeLookups}
          canCreate
          noticePrefill={escalatePrefill}
          legalNoticeId={escalateNotice.id}
          open={escalateOpen}
          onOpenChange={(open) => {
            setEscalateOpen(open);
            if (!open) setEscalateNotice(null);
          }}
          hideTrigger
        />
      )}
    </>
  );
}
