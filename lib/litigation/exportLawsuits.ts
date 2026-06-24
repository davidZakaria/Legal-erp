import { format } from "date-fns";
import * as XLSX from "xlsx";
import { getLawsuitStatusLabelAr } from "@/lib/litigation/constants";

export type LawsuitExportRow = {
  caseNumber: string;
  year: number;
  clientName: string;
  opponentName: string;
  courtName: string;
  overallStatus: string;
  archiveNumber: string | null;
  registrationDate: string;
};

export function exportLawsuitsToExcel(lawsuits: LawsuitExportRow[], fileName: string) {
  const rows = lawsuits.map((l) => ({
    "رقم الدعوى": l.caseNumber,
    السنة: l.year,
    الموكل: l.clientName,
    الخصم: l.opponentName,
    المحكمة: l.courtName,
    "حالة القضية": getLawsuitStatusLabelAr(l.overallStatus),
    "رقم الحفظ": l.archiveNumber ?? "—",
    "تاريخ التسجيل": format(new Date(l.registrationDate), "yyyy-MM-dd"),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(rows),
    "الدعاوى"
  );

  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
