"use client";

import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";

type ProsecutionItem = {
  id: string;
  caseNumber: string;
  year: number;
  clientName: string;
  issueType: string;
  lawyerName: string;
};

export function ProsecutionsGrouped({
  grouped,
}: {
  grouped: Record<string, ProsecutionItem[]>;
}) {
  const t = useTranslations("prosecutions");
  const tLit = useTranslations("litigation");
  const tCommon = useTranslations("common");

  const stations = Object.keys(grouped).sort();

  if (stations.length === 0) {
    return (
      <Card className="border-slate-200 p-8 text-center text-slate-500 shadow-sm">
        {tCommon("noData")}
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {stations.map((station) => (
        <section key={station}>
          <div className="mb-4 flex items-center gap-3 border-s-4 border-slate-900 ps-4">
            <MapPin className="h-5 w-5 text-slate-900" />
            <h2 className="text-start text-lg font-bold text-slate-900">
              {t("casesAt", { station })}
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {grouped[station].length}
            </span>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped[station].map((item) => (
                    <TableRow key={item.id} className="bg-white">
                      <TableCell className="font-medium text-slate-900">{item.caseNumber}</TableCell>
                      <TableCell>{item.year}</TableCell>
                      <TableCell>{item.clientName}</TableCell>
                      <TableCell>{item.issueType}</TableCell>
                      <TableCell className="text-slate-600">{item.lawyerName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      ))}
    </div>
  );
}
