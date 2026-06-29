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
import { RecordActions } from "@/components/crud/RecordActions";
import { deleteAssemblyArchive } from "@/app/actions/gafiCrud";
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
  canCreate,
  canUpdate,
  canDelete,
  onEdit,
}: {
  archives: AssemblyArchiveRow[];
  companies: SubsidiaryCompanyRow[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit?: (archive: AssemblyArchiveRow) => void;
}) {
  const t = useTranslations("gafi");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <CreateAssemblyArchiveDialog
            canCreate={canCreate}
            canUpdate={canUpdate}
            companies={companies}
          />
        </div>
      )}

      <Card className="overflow-hidden border-border shadow-sm">
        <CardHeader className="border-b border-border bg-card py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileArchive className="h-4 w-4" />
            {t("assembliesArchive")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/80 hover:bg-muted/80">
                <TableHead>{t("companyName")}</TableHead>
                <TableHead>{t("assemblyType")}</TableHead>
                <TableHead>{t("assemblyDateHeld")}</TableHead>
                <TableHead className="text-center">{t("assemblyFile")}</TableHead>
                {(canUpdate || canDelete) && (
                  <TableHead className="text-center">{tCommon("actions")}</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {archives.length ? (
                archives.map((archive) => (
                  <TableRow key={archive.id} className="bg-card">
                    <TableCell className="font-medium text-foreground">
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
                    {(canUpdate || canDelete) && (
                      <TableCell>
                        <RecordActions
                          showEdit={canUpdate}
                          showDelete={canDelete}
                          onEdit={
                            canUpdate && onEdit ? () => onEdit(archive) : undefined
                          }
                          onDelete={
                            canDelete
                              ? () => deleteAssemblyArchive(archive.id)
                              : undefined
                          }
                          deleteItemName={`${archive.companyName} — ${archive.type}`}
                          deleteTitle={t("deleteAssemblyTitle")}
                          deleteDescription={t("deleteAssemblyDescription")}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={canUpdate || canDelete ? 5 : 4} className="py-8 text-center text-muted-foreground">
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
