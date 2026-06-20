"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, MapPin, MessageCircle, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { LegalBadge } from "@/lib/legal-labels";
import {
  BOUNCED_CHECK_ISSUE_TYPE,
  PROSECUTION_STATUSES,
} from "@/lib/prosecutions/constants";
import { updateProsecutionStatus } from "@/app/actions/updateProsecutionStatus";
import { useRouter } from "@/i18n/navigation";

export type ProsecutionItem = {
  id: string;
  caseNumber: string;
  year: number;
  clientName: string;
  issueType: string;
  status: string;
  lawyerName: string;
};

export function ProsecutionsGrouped({
  grouped,
  canManage,
}: {
  grouped: Record<string, ProsecutionItem[]>;
  canManage: boolean;
}) {
  const t = useTranslations("prosecutions");
  const tLit = useTranslations("litigation");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sendingStation, setSendingStation] = useState<string | null>(null);

  const stations = Object.keys(grouped).sort();

  const handleStatusUpdate = (prosecutionId: string, newStatus: string) => {
    setUpdatingId(prosecutionId);
    startTransition(async () => {
      const result = await updateProsecutionStatus(prosecutionId, newStatus);
      setUpdatingId(null);
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error ?? t("updateError"));
      }
    });
  };

  const handleGenerateReport = async (prosecutionId: string) => {
    toast.info(t("generatingReport"));
    try {
      const response = await fetch(`/api/prosecutions/generate-report/${prosecutionId}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        toast.error((error as { error?: string }).error ?? t("reportError"));
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "Bounced_Check_Report.docx";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      toast.success(t("reportSuccess"));
    } catch {
      toast.error(t("reportError"));
    }
  };

  const handleSendMission = async (station: string, items: ProsecutionItem[]) => {
    setSendingStation(station);
    const toastId = toast.loading(t("missionSending"));

    try {
      const response = await fetch("/api/whatsapp/send-mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policeStation: station,
          prosecutionIds: items.map((item) => item.id),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        sent?: number;
        total?: number;
        error?: string;
      };

      if (!response.ok) {
        toast.error(data.error ?? t("missionError"), { id: toastId });
        return;
      }

      toast.success(
        t("missionSuccess", { sent: data.sent ?? 0, total: data.total ?? 0 }),
        { id: toastId }
      );
    } catch {
      toast.error(t("missionError"), { id: toastId });
    } finally {
      setSendingStation(null);
    }
  };

  if (stations.length === 0) {
    return (
      <Card className="border-slate-200 p-8 text-center text-slate-500 shadow-sm">
        {tCommon("noData")}
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {stations.map((station) => {
        const items = grouped[station];
        const isSending = sendingStation === station;

        return (
          <section key={station}>
            <div className="mb-4 flex flex-wrap items-center gap-3 border-s-4 border-slate-900 ps-4">
              <MapPin className="h-5 w-5 text-slate-900" />
              <h2 className="text-start text-lg font-bold text-slate-900">
                {t("casesAt", { station })}
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {items.length}
              </span>
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ms-auto gap-2 border-green-200 bg-green-50/50 hover:bg-green-50"
                  onClick={() => handleSendMission(station, items)}
                  disabled={isSending}
                >
                  <MessageCircle className="h-4 w-4 text-green-600" />
                  {isSending ? t("missionSending") : t("sendMission")}
                </Button>
              )}
            </div>

            <Card className="overflow-hidden border-slate-200 shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead>{tLit("caseNumber")}</TableHead>
                      <TableHead>{tLit("year")}</TableHead>
                      <TableHead>{t("clientName")}</TableHead>
                      <TableHead>{t("issueType")}</TableHead>
                      <TableHead>{tLit("assignedLawyer")}</TableHead>
                      <TableHead>{tCommon("status")}</TableHead>
                      {canManage && (
                        <TableHead className="text-center">{tCommon("actions")}</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const isUpdating = updatingId === item.id && isPending;

                      return (
                        <TableRow key={item.id} className="bg-white">
                          <TableCell className="font-medium text-slate-900">
                            {item.caseNumber}
                          </TableCell>
                          <TableCell>{item.year}</TableCell>
                          <TableCell>{item.clientName}</TableCell>
                          <TableCell>{item.issueType}</TableCell>
                          <TableCell className="text-slate-600">{item.lawyerName}</TableCell>
                          <TableCell>
                            <LegalBadge
                              category="prosecutionStatus"
                              value={item.status}
                              locale={locale}
                            />
                          </TableCell>
                          {canManage && (
                            <TableCell className="text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={isUpdating}
                                    className="h-8 w-8"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {PROSECUTION_STATUSES.map((status) =>
                                    status !== item.status ? (
                                      <DropdownMenuItem
                                        key={status}
                                        onClick={() => handleStatusUpdate(item.id, status)}
                                      >
                                        {t(`status_${status}`)}
                                      </DropdownMenuItem>
                                    ) : null
                                  )}
                                  {item.issueType === BOUNCED_CHECK_ISSUE_TYPE && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleGenerateReport(item.id)}
                                      >
                                        <FileText className="me-2 h-4 w-4" />
                                        {t("generateReport")}
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        );
      })}
    </div>
  );
}
