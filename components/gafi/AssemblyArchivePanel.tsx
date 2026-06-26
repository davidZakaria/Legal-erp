"use client";

import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { Download, FileArchive } from "lucide-react";
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
import { LegalBadge } from "@/lib/legal-labels";
import { CreateAssemblyArchiveDialog } from "./CreateAssemblyArchiveDialog";
import type { SubsidiaryCompanyRow } from "./SubsidiaryRegistryTable";

export type AssemblyArchiveRow = {
  id: string;
  companyId: string;
  companyName: string;
  type: string;
  dateHeld: string;
  fileUrl: string | null;
};

export function AssemblyArchivePanel({
  archives,
  companies,
  canManage,
}: {
  archives: AssemblyArchiveRow[];
  companies: SubsidiaryCompanyRow[];
  canManage: boolean;
}) {
  const t = useTranslations("gafi");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <CreateAssemblyArchiveDialog canCreate={canManage} companies={companies} />
        </div>
      )}

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-white py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <FileArchive className="h-4 w-4" />
            {t("assembliesArchive")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead>{t("companyName")}</TableHead>
                <TableHead>{t("assemblyType")}</TableHead>
                <TableHead>{t("assemblyDateHeld")}</TableHead>
                <TableHead className="text-center">{t("assemblyFile")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archives.length ? (
                archives.map((archive) => (
                  <TableRow key={archive.id} className="bg-white">
                    <TableCell className="font-medium text-slate-900">
                      {archive.companyName}
                    </TableCell>
                    <TableCell>
                      <LegalBadge
                        category="assemblyType"
                        value={archive.type}
                        locale={locale}
                      />
                    </TableCell>
                    <TableCell>{format(new Date(archive.dateHeld), "yyyy-MM-dd")}</TableCell>
                    <TableCell className="text-center">
                      {archive.fileUrl ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={archive.fileUrl} download target="_blank" rel="noreferrer">
                            <Download className="me-2 h-4 w-4" />
                            {t("downloadAssembly")}
                          </a>
                        </Button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-slate-500">
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
