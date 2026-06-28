"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { format, differenceInDays, startOfDay } from "date-fns";
import {
  AlertCircle,
  FileText,
  MoreHorizontal,
  Radar,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LegalBadge } from "@/lib/legal-labels";
import { cn } from "@/lib/utils";
import { updateGafiTaskStatus } from "@/app/actions/updateGafiTaskStatus";
import { useRouter } from "@/i18n/navigation";

export type GafiTaskRow = {
  id: string;
  taskType: string;
  title: string;
  deadline: string;
  status: string;
};

function isDeadlineUrgent(deadline: Date, status: string): boolean {
  if (status === "COMPLETED") return false;
  const daysUntil = differenceInDays(startOfDay(deadline), startOfDay(new Date()));
  return daysUntil <= 14;
}

export function GafiTable({
  tasks,
  canManage,
}: {
  tasks: GafiTaskRow[];
  canManage: boolean;
}) {
  const t = useTranslations("gafi");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusUpdate = (taskId: string, newStatus: string) => {
    setUpdatingId(taskId);
    startTransition(async () => {
      const result = await updateGafiTaskStatus(taskId, newStatus);
      setUpdatingId(null);
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error ?? t("updateError"));
      }
    });
  };

  const handleGenerateMinutes = async (taskId: string) => {
    toast.info(t("generatingDocument"));
    try {
      const response = await fetch(`/api/gafi/generate-minutes/${taskId}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        toast.error((error as { error?: string }).error ?? t("downloadError"));
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "Assembly_Minutes.docx";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      toast.success(t("downloadSuccess"));
    } catch {
      toast.error(t("downloadError"));
    }
  };

  const urgentCount = tasks.filter((task) =>
    isDeadlineUrgent(new Date(task.deadline), task.status)
  ).length;

  return (
    <div className="space-y-4">
      {urgentCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          <Radar className="h-4 w-4" />
          <span>{t("deadlineRadarAlert", { count: urgentCount })}</span>
        </div>
      )}

      <Card className="overflow-hidden border-border shadow-sm">
        <CardHeader className="border-b border-border bg-card py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Radar className="h-4 w-4 text-destructive" />
            {t("deadlineRadar")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/80 hover:bg-muted/80">
                <TableHead>{t("taskType")}</TableHead>
                <TableHead>{t("taskTitle")}</TableHead>
                <TableHead>{t("deadline")}</TableHead>
                <TableHead>{tCommon("status")}</TableHead>
                {canManage && <TableHead className="text-center">{tCommon("actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length ? (
                tasks.map((task) => {
                  const deadline = new Date(task.deadline);
                  const urgent = isDeadlineUrgent(deadline, task.status);
                  const isUpdating = updatingId === task.id && isPending;

                  return (
                    <TableRow
                      key={task.id}
                      className={cn("bg-card", urgent && "bg-destructive/5")}
                    >
                      <TableCell>
                        <LegalBadge
                          category="gafiTaskType"
                          value={task.taskType}
                          locale={locale}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{task.title}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-2",
                            urgent && "font-bold text-destructive"
                          )}
                        >
                          {format(deadline, "yyyy-MM-dd")}
                          {urgent && (
                            <AlertCircle className="inline h-4 w-4 animate-pulse text-destructive" />
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <LegalBadge
                          category="gafiStatus"
                          value={task.status}
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
                              {task.status !== "IN_PROGRESS" && task.status !== "COMPLETED" && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate(task.id, "IN_PROGRESS")}
                                >
                                  {t("markInProgress")}
                                </DropdownMenuItem>
                              )}
                              {task.status !== "COMPLETED" && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate(task.id, "COMPLETED")}
                                >
                                  {t("markCompleted")}
                                </DropdownMenuItem>
                              )}
                              {task.taskType === "ASSEMBLY" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleGenerateMinutes(task.id)}
                                  >
                                    <FileText className="me-2 h-4 w-4" />
                                    {t("generateAssemblyMinutes")}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 5 : 4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {tCommon("noData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
