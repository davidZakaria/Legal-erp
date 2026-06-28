import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewAuditLogs } from "@/lib/rbac";
import { enrichAuditLogs } from "@/lib/audit-labels";
import { format } from "date-fns";
import { arEG, enUS } from "date-fns/locale";
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
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function AuditLogsPage() {
  const t = await getTranslations("auditLogs");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const session = await auth();

  if (!session?.user) {
    redirect({ href: "/login", locale });
  }

  const user = session!.user;

  if (!canViewAuditLogs(user.role)) {
    redirect({ href: "/", locale });
  }

  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { timestamp: "desc" },
    take: 200,
  });

  const enrichedLogs = await enrichAuditLogs(logs, locale);
  const dateLocale = locale === "ar" ? arEG : enUS;

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} icon={ClipboardList} />
      <Card className="overflow-hidden border-border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/80 hover:bg-muted/80">
                <TableHead>{t("timestamp")}</TableHead>
                <TableHead>{t("user")}</TableHead>
                <TableHead>{t("action")}</TableHead>
                <TableHead>{t("targetDetails")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrichedLogs.length ? (
                enrichedLogs.map((log) => (
                  <TableRow key={log.id} className="bg-card">
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      <div className="font-medium text-foreground">
                        {format(log.timestamp, "dd MMM yyyy", { locale: dateLocale })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(log.timestamp, "HH:mm:ss")}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {log.user.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="bg-accent font-medium text-foreground"
                      >
                        {log.actionLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md text-foreground">
                      {log.targetDetails}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
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
