"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { Gavel, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LegalBadge, ExpertsBadge } from "@/lib/legal-labels";
import { SessionOutcomeModal } from "./SessionOutcomeModal";
import { LawsuitAttachmentsButton } from "./LawsuitAttachmentsSheet";
import { LitigationFilterBar } from "./LitigationFilterBar";
import { RecordActions } from "@/components/crud/RecordActions";
import {
  EditLawsuitDialog,
  LawsuitFinancialSummary,
} from "./EditLawsuitDialog";
import type { LawsuitFilters } from "@/lib/litigation/constants";
import type { LawsuitExportRow } from "@/lib/litigation/exportLawsuits";

export type LawsuitWithSessions = {
  id: string;
  caseNumber: string;
  year: number;
  courtName: string;
  opponentName: string;
  clientName: string;
  archiveNumber: string | null;
  registrationDate: string;
  overallStatus: string;
  isAtExperts: boolean;
  expertOffice: string | null;
  expertName: string | null;
  expertFileNumber: string | null;
  awardedCompensation: number;
  judicialFees: number;
  assignedLawyerId: string;
  lawyerName: string;
  sessions: Array<{
    id: string;
    sessionDate: string;
    requiredAction: string;
    status: string;
    sessionOutcome: string | null;
  }>;
};

export function LitigationView({
  lawsuits,
  filters,
  courts,
  years,
  canEdit,
  canDelete = false,
  expertOfficeLookups = [],
  onEditFull,
  onDelete,
  deleteSuccessMessage,
  deleteErrorMessage,
}: {
  lawsuits: LawsuitWithSessions[];
  filters: LawsuitFilters;
  courts: string[];
  years: number[];
  canEdit: boolean;
  canDelete?: boolean;
  expertOfficeLookups?: { id: string; name: string }[];
  onEditFull?: (lawsuit: LawsuitWithSessions) => void;
  onDelete?: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteSuccessMessage?: string;
  deleteErrorMessage?: string;
}) {
  const t = useTranslations("litigation");
  const locale = useLocale();
  const [modalSessionId, setModalSessionId] = useState<string | null>(null);

  const exportRows: LawsuitExportRow[] = lawsuits.map((l) => ({
    caseNumber: l.caseNumber,
    year: l.year,
    clientName: l.clientName,
    opponentName: l.opponentName,
    courtName: l.courtName,
    overallStatus: l.overallStatus,
    archiveNumber: l.archiveNumber,
    registrationDate: l.registrationDate,
  }));

  return (
    <>
      <LitigationFilterBar
        filters={filters}
        courts={courts}
        years={years}
        exportRows={exportRows}
      />

      {lawsuits.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {t("noLawsuitsMatch")}
        </p>
      ) : (
        <div className="space-y-6">
          {lawsuits.map((lawsuit) => {
            const caseLabel = `${t("caseNumber")} ${lawsuit.caseNumber} / ${lawsuit.year}`;

            return (
              <Card key={lawsuit.id} className="overflow-hidden border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 bg-white">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                        <Scale className="h-5 w-5" />
                      </div>
                      <div className="text-start">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-lg text-slate-900">{caseLabel}</CardTitle>
                          <LegalBadge
                            category="lawsuitStatus"
                            value={lawsuit.overallStatus}
                            locale={locale}
                          />
                          {lawsuit.isAtExperts && <ExpertsBadge locale={locale} />}
                        </div>
                        <CardDescription className="mt-1 text-base font-medium text-slate-700">
                          {lawsuit.courtName}
                        </CardDescription>
                        {lawsuit.archiveNumber && (
                          <p className="mt-2 text-sm font-semibold text-slate-800">
                            {t("archiveFile")}: {lawsuit.archiveNumber}
                          </p>
                        )}
                        {lawsuit.isAtExperts && lawsuit.expertOffice && (
                          <p className="mt-2 text-sm font-medium text-purple-700">
                            {t("expertOffice")}: {lawsuit.expertOffice}
                            {lawsuit.expertFileNumber && (
                              <> · {t("expertFileNumber")}: {lawsuit.expertFileNumber}</>
                            )}
                          </p>
                        )}
                        {lawsuit.isAtExperts && lawsuit.expertName && (
                          <p className="mt-1 text-sm text-purple-600">
                            {t("expertName")}: {lawsuit.expertName}
                          </p>
                        )}
                        <LawsuitFinancialSummary
                          awardedCompensation={lawsuit.awardedCompensation}
                          judicialFees={lawsuit.judicialFees}
                          locale={locale}
                        />
                        <p className="mt-2 text-sm text-slate-500">
                          {t("clientName")}: {lawsuit.clientName} · {t("opponent")}:{" "}
                          {lawsuit.opponentName} · {t("assignedLawyer")}: {lawsuit.lawyerName}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {t("registrationDate")}:{" "}
                          {format(new Date(lawsuit.registrationDate), "yyyy-MM-dd")}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {canEdit && onEditFull && (
                        <RecordActions
                          onEdit={() => onEditFull(lawsuit)}
                          onDelete={onDelete ? () => onDelete(lawsuit.id) : undefined}
                          showDelete={canDelete}
                          deleteItemName={`${lawsuit.caseNumber}/${lawsuit.year}`}
                          deleteSuccessMessage={deleteSuccessMessage}
                          deleteErrorMessage={deleteErrorMessage}
                        />
                      )}
                      <EditLawsuitDialog
                        lawsuit={{
                          id: lawsuit.id,
                          caseLabel,
                          isAtExperts: lawsuit.isAtExperts,
                          expertOffice: lawsuit.expertOffice,
                          expertName: lawsuit.expertName,
                          expertFileNumber: lawsuit.expertFileNumber,
                          awardedCompensation: lawsuit.awardedCompensation,
                          judicialFees: lawsuit.judicialFees,
                        }}
                        canEdit={canEdit}
                        locale={locale}
                        expertOfficeLookups={expertOfficeLookups}
                      />
                      <LawsuitAttachmentsButton lawsuitId={lawsuit.id} caseLabel={caseLabel} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead>{t("sessionDate")}</TableHead>
                        <TableHead>{t("requiredAction")}</TableHead>
                        <TableHead>{t("sessionStatus")}</TableHead>
                        <TableHead>{t("sessionOutcome")}</TableHead>
                        <TableHead className="text-center">{t("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lawsuit.sessions.map((s) => (
                        <TableRow key={s.id} className="bg-white">
                          <TableCell className="font-medium">
                            {format(new Date(s.sessionDate), "yyyy-MM-dd HH:mm")}
                          </TableCell>
                          <TableCell>{s.requiredAction}</TableCell>
                          <TableCell>
                            <LegalBadge
                              category="courtSessionStatus"
                              value={s.status}
                              locale={locale}
                            />
                          </TableCell>
                          <TableCell className="max-w-xs text-slate-600">
                            {s.sessionOutcome ?? "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            {s.status === "PENDING" && (
                              <Button
                                size="sm"
                                className="gap-2 bg-slate-900 hover:bg-slate-800"
                                onClick={() => setModalSessionId(s.id)}
                              >
                                <Gavel className="h-4 w-4" />
                                {t("logOutcome")}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {modalSessionId && (
        <SessionOutcomeModal
          sessionId={modalSessionId}
          open={!!modalSessionId}
          onOpenChange={(open) => !open && setModalSessionId(null)}
        />
      )}
    </>
  );
}
