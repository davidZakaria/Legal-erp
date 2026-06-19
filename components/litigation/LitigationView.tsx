"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [modalSessionId, setModalSessionId] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-6">
        {lawsuits.map((lawsuit) => (
          <Card key={lawsuit.id}>
            <CardHeader>
              <CardTitle className="text-start">
                {t("caseNumber")} {lawsuit.caseNumber} / {lawsuit.year} —{" "}
                {lawsuit.courtName}
              </CardTitle>
              <p className="text-sm text-muted-foreground text-start">
                {t("opponent")}: {lawsuit.opponentName} | {t("assignedLawyer")}:{" "}
                {lawsuit.lawyerName}
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("sessionDate")}</TableHead>
                    <TableHead>{t("requiredAction")}</TableHead>
                    <TableHead>{t("pending")}</TableHead>
                    <TableHead>{t("sessionOutcome")}</TableHead>
                    <TableHead>{t("logOutcome")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lawsuit.sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        {format(new Date(s.sessionDate), "yyyy-MM-dd HH:mm")}
                      </TableCell>
                      <TableCell>{s.requiredAction}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            s.status === "PENDING" ? "destructive" : "secondary"
                          }
                        >
                          {s.status === "PENDING" ? t("pending") : t("completed")}
                        </Badge>
                      </TableCell>
                      <TableCell>{s.sessionOutcome ?? "—"}</TableCell>
                      <TableCell>
                        {s.status === "PENDING" && (
                          <Button
                            size="sm"
                            onClick={() => setModalSessionId(s.id)}
                          >
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
