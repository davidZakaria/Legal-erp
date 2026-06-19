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
import { LegalBadge } from "@/lib/legal-labels";
import { SessionOutcomeModal } from "./SessionOutcomeModal";

export type LawsuitWithSessions = {
  id: string;
  caseNumber: string;
  year: number;
  courtName: string;
  opponentName: string;
  lawyerName: string;
  sessions: Array<{
    id: string;
    sessionDate: string;
    requiredAction: string;
    status: string;
    sessionOutcome: string | null;
  }>;
};

export function LitigationView({ lawsuits }: { lawsuits: LawsuitWithSessions[] }) {
  const t = useTranslations("litigation");
  const locale = useLocale();
  const [modalSessionId, setModalSessionId] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-6">
        {lawsuits.map((lawsuit) => (
          <Card key={lawsuit.id} className="overflow-hidden border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-white">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <Scale className="h-5 w-5" />
                </div>
                <div className="text-start">
                  <CardTitle className="text-lg text-slate-900">
                    {t("caseNumber")} {lawsuit.caseNumber} / {lawsuit.year}
                  </CardTitle>
                  <CardDescription className="mt-1 text-base font-medium text-slate-700">
                    {lawsuit.courtName}
                  </CardDescription>
                  <p className="mt-2 text-sm text-slate-500">
                    {t("opponent")}: {lawsuit.opponentName} · {t("assignedLawyer")}: {lawsuit.lawyerName}
                  </p>
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
        ))}
      </div>

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
