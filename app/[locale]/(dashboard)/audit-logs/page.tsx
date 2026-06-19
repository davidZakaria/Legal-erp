import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewAuditLogs } from "@/lib/rbac";
import { format } from "date-fns";
import { ClipboardList } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function AuditLogsPage() {
  const t = await getTranslations("auditLogs");
  const tCommon = await getTranslations("common");
  const session = await auth();

  if (!session?.user || !canViewAuditLogs(session.user.role)) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-12">
        <p className="text-lg font-medium text-destructive">{tCommon("accessDenied")}</p>
      </div>
    );
  }

  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { timestamp: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader title={t("title")} icon={ClipboardList} />
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead>{t("timestamp")}</TableHead>
                <TableHead>{t("user")}</TableHead>
                <TableHead>{t("action")}</TableHead>
                <TableHead>{t("entity")}</TableHead>
                <TableHead>{t("entityId")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className="bg-white">
                  <TableCell className="text-slate-600">
                    {format(log.timestamp, "yyyy-MM-dd HH:mm:ss")}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{log.user.name}</TableCell>
                  <TableCell>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell>{log.entityName}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">{log.entityId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
