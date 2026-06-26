"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LitigationView, type LawsuitWithSessions } from "./LitigationView";
import {
  CreateLawsuitDialog,
  type LawyerOption,
  type LookupOption,
  type LawsuitFormInitialData,
} from "./CreateLawsuitDialog";
import { deleteLawsuit } from "@/app/actions/lawsuitCrud";
import type { LawsuitFilters } from "@/lib/litigation/constants";

export function LitigationModule({
  lawsuits,
  filters,
  courts,
  years,
  lawyers,
  courtLookups,
  expertOfficeLookups,
  canEdit,
  canDelete,
}: {
  lawsuits: LawsuitWithSessions[];
  filters: LawsuitFilters;
  courts: string[];
  years: number[];
  lawyers: LawyerOption[];
  courtLookups: LookupOption[];
  expertOfficeLookups: LookupOption[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const tCommon = useTranslations("common");
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<LawsuitFormInitialData | null>(null);

  const handleEdit = (lawsuit: LawsuitWithSessions) => {
    setEditItem({
      id: lawsuit.id,
      caseNumber: lawsuit.caseNumber,
      year: lawsuit.year,
      courtName: lawsuit.courtName,
      opponentName: lawsuit.opponentName,
      clientName: lawsuit.clientName,
      archiveNumber: lawsuit.archiveNumber ?? "",
      registrationDate: lawsuit.registrationDate,
      overallStatus: lawsuit.overallStatus as LawsuitFormInitialData["overallStatus"],
      assignedLawyerId: lawsuit.assignedLawyerId,
      awardedCompensation: lawsuit.awardedCompensation,
      judicialFees: lawsuit.judicialFees,
      isAtExperts: lawsuit.isAtExperts,
      expertOffice: lawsuit.expertOffice ?? "",
      expertName: lawsuit.expertName ?? "",
      expertFileNumber: lawsuit.expertFileNumber ?? "",
    });
    setEditOpen(true);
  };

  return (
    <>
      <LitigationView
        lawsuits={lawsuits}
        filters={filters}
        courts={courts}
        years={years}
        canEdit={canEdit}
        canDelete={canDelete}
        expertOfficeLookups={expertOfficeLookups}
        onEditFull={handleEdit}
        onDelete={(id) => deleteLawsuit(id)}
        deleteSuccessMessage={tCommon("deleteSuccess")}
        deleteErrorMessage={tCommon("deleteFailed")}
      />
      <CreateLawsuitDialog
        lawyers={lawyers}
        courtLookups={courtLookups}
        expertOfficeLookups={expertOfficeLookups}
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
