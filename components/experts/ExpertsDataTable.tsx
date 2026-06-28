"use client";

import { Fragment, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  ChevronDown,
  RotateCcw,
  User,
  FileText,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LegalBadge } from "@/lib/legal-labels";
import { cn } from "@/lib/utils";
import { returnLawsuitFromExperts } from "@/app/actions/returnLawsuitFromExperts";
import { AddExpertSessionDialog } from "./AddExpertSessionDialog";
import { useRouter } from "@/i18n/navigation";

export type ExpertLawsuitRow = {
  id: string;
  caseNumber: string;
  year: number;
  courtName: string;
  clientName: string;
  expertOffice: string | null;
  expertName: string | null;
  expertFileNumber: string | null;
  judicialFees: number;
  awardedCompensation: number;
  lawyerName: string;
  expertSessions: Array<{
    id: string;
    sessionDate: string;
    requiredAction: string;
    status: string;
    sessionOutcome: string | null;
  }>;
};

function formatEgp(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function ExpertsDataTable({
  lawsuits,
  canManage,
}: {
  lawsuits: ExpertLawsuitRow[];
  canManage: boolean;
}) {
  const t = useTranslations("experts");
  const tLit = useTranslations("litigation");
  const tDash = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [returningId, setReturningId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleReturnToCourt = (lawsuitId: string) => {
    setReturningId(lawsuitId);
    startTransition(async () => {
      const result = await returnLawsuitFromExperts(lawsuitId);
      setReturningId(null);
      if (result.success) {
        toast.success(t("returnSuccess"));
        router.refresh();
      } else {
        toast.error(result.error ?? t("returnError"));
      }
    });
  };

  return (
    <Card className="overflow-hidden border-purple-200 shadow-sm dark:border-purple-500/30">
      <CardHeader className="border-b border-purple-100 bg-purple-50/50 py-3 dark:border-purple-500/20 dark:bg-purple-950/40">
        <CardTitle className="text-base text-purple-900 dark:text-purple-200">
          {t("tableTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/80 hover:bg-muted/80">
              <TableHead className="w-10" />
              <TableHead>{tLit("caseNumber")}</TableHead>
              <TableHead>{tLit("clientName")}</TableHead>
              <TableHead>{tLit("expertOffice")}</TableHead>
              <TableHead>{tLit("expertFileNumber")}</TableHead>
              <TableHead>{tLit("judicialFees")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lawsuits.length ? (
              lawsuits.map((lawsuit) => {
                const expanded = expandedIds.has(lawsuit.id);
                const caseLabel = `${tLit("caseNumber")} ${lawsuit.caseNumber} / ${lawsuit.year}`;
                const isReturning = returningId === lawsuit.id && isPending;

                return (
                  <Fragment key={lawsuit.id}>
                    <TableRow
                      className={cn(
                        "cursor-pointer bg-card hover:bg-purple-50/40 dark:hover:bg-purple-950/25",
                        expanded && "border-b-0 bg-purple-50/30 dark:bg-purple-950/20"
                      )}
                      onClick={() => toggleExpanded(lawsuit.id)}
                    >
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleExpanded(lawsuit.id);
                          }}
                        >
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform",
                              expanded && "rotate-180"
                            )}
                          />
                        </Button>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {lawsuit.caseNumber} / {lawsuit.year}
                        <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                          {lawsuit.courtName}
                        </p>
                      </TableCell>
                      <TableCell className="text-foreground">{lawsuit.clientName}</TableCell>
                      <TableCell className="font-medium text-purple-800 dark:text-purple-300">
                        {lawsuit.expertOffice ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-foreground">
                        {lawsuit.expertFileNumber ?? "—"}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {formatEgp(lawsuit.judicialFees, locale)} {tDash("egp")}
                      </TableCell>
                    </TableRow>

                    {expanded && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={6} className="p-0">
                          <div className="border-t border-purple-100 bg-gradient-to-b from-purple-50/40 to-background px-4 py-5 dark:border-purple-500/20 dark:from-purple-950/30 dark:to-background">
                            <div className="grid gap-5 lg:grid-cols-3">
                              <div className="space-y-3 lg:col-span-1">
                                <div className="rounded-lg border border-purple-100 bg-card p-4 shadow-sm dark:border-purple-500/25">
                                  <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                                    <User className="h-3.5 w-3.5" />
                                    {t("expertDetails")}
                                  </p>
                                  <dl className="space-y-2 text-sm">
                                    <div>
                                      <dt className="text-muted-foreground">{tLit("expertName")}</dt>
                                      <dd className="font-semibold text-foreground">
                                        {lawsuit.expertName ?? "—"}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="text-muted-foreground">{tLit("expertOffice")}</dt>
                                      <dd className="font-medium text-foreground">
                                        {lawsuit.expertOffice ?? "—"}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="text-muted-foreground">{tLit("expertFileNumber")}</dt>
                                      <dd className="font-mono font-medium text-foreground">
                                        {lawsuit.expertFileNumber ?? "—"}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="text-muted-foreground">{tLit("assignedLawyer")}</dt>
                                      <dd className="text-foreground">{lawsuit.lawyerName}</dd>
                                    </div>
                                    {lawsuit.awardedCompensation > 0 && (
                                      <div>
                                        <dt className="text-muted-foreground">
                                          {tLit("awardedCompensation")}
                                        </dt>
                                        <dd className="font-semibold text-emerald-700 dark:text-emerald-400">
                                          {formatEgp(lawsuit.awardedCompensation, locale)}{" "}
                                          {tDash("egp")}
                                        </dd>
                                      </div>
                                    )}
                                  </dl>
                                </div>

                                {canManage && (
                                  <div className="flex flex-col gap-2">
                                    <AddExpertSessionDialog
                                      lawsuitId={lawsuit.id}
                                      caseLabel={caseLabel}
                                      canManage={canManage}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="gap-2"
                                      disabled={isReturning}
                                      onClick={() => handleReturnToCourt(lawsuit.id)}
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                      {isReturning ? tCommon("loading") : t("returnToCourt")}
                                    </Button>
                                  </div>
                                )}
                              </div>

                              <div className="lg:col-span-2">
                                <div className="rounded-lg border border-purple-100 bg-card p-4 shadow-sm dark:border-purple-500/25">
                                  <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                                    <Clock className="h-3.5 w-3.5" />
                                    {t("expertSessionsTimeline")}
                                  </p>
                                  {lawsuit.expertSessions.length ? (
                                    <ul className="space-y-3">
                                      {lawsuit.expertSessions.map((session, index) => (
                                        <li
                                          key={session.id}
                                          className="relative border-s-2 border-purple-200 ps-4 dark:border-purple-500/40"
                                        >
                                          <div className="absolute -start-[5px] top-1.5 h-2 w-2 rounded-full bg-purple-600 dark:bg-purple-400" />
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-semibold text-foreground">
                                              {format(
                                                new Date(session.sessionDate),
                                                "yyyy-MM-dd HH:mm"
                                              )}
                                            </span>
                                            <LegalBadge
                                              category="courtSessionStatus"
                                              value={session.status}
                                              locale={locale}
                                            />
                                            {index === 0 && (
                                              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 dark:hover:bg-purple-950/60">
                                                {t("latestSession")}
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="mt-1 text-sm text-foreground">
                                            <FileText className="me-1 inline h-3.5 w-3.5" />
                                            {session.requiredAction}
                                          </p>
                                          {session.sessionOutcome && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                              {tLit("sessionOutcome")}: {session.sessionOutcome}
                                            </p>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">{t("noExpertSessions")}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {t("noCasesAtExperts")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
