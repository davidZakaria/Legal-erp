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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const stations = Object.keys(grouped).sort();

  if (stations.length === 0) {
    return <p className="text-muted-foreground">{t("title")} — no cases</p>;
  }

  return (
    <div className="space-y-6">
      {stations.map((station) => (
        <Card key={station}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-start text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              {t("casesAt", { station })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tLit("caseNumber")}</TableHead>
                  <TableHead>{tLit("year")}</TableHead>
                  <TableHead>{t("clientName")}</TableHead>
                  <TableHead>{t("issueType")}</TableHead>
                  <TableHead>{tLit("assignedLawyer")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped[station].map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.caseNumber}</TableCell>
                    <TableCell>{item.year}</TableCell>
                    <TableCell>{item.clientName}</TableCell>
                    <TableCell>{item.issueType}</TableCell>
                    <TableCell>{item.lawyerName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
