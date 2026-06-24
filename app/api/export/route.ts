import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLawsuitStatusLabelAr } from "@/lib/litigation/constants";
import { isManagerOrAbove } from "@/lib/rbac";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isManagerOrAbove(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [lawsuits, contracts] = await Promise.all([
    prisma.lawsuit.findMany({
      include: { assignedLawyer: { select: { name: true } } },
      orderBy: [{ year: "desc" }, { caseNumber: "asc" }],
    }),
    prisma.contract.findMany({
      where: { status: "ACTIVE" },
      include: { project: { select: { name: true } } },
      orderBy: { guaranteeExpiryDate: "asc" },
    }),
  ]);

  const lawsuitRows = lawsuits.map((l) => ({
    "رقم الدعوى": l.caseNumber,
    السنة: l.year,
    الموكل: l.clientName,
    المحكمة: l.courtName,
    "الخصم / المدعى عليه": l.opponentName,
    "حالة القضية": getLawsuitStatusLabelAr(l.overallStatus),
    "رقم الحفظ": l.archiveNumber ?? "—",
    "تاريخ التسجيل": format(l.registrationDate, "yyyy-MM-dd"),
    "المحامي المكلف": l.assignedLawyer.name,
  }));

  const contractRows = contracts.map((c) => ({
    المقاول: c.contractorName,
    المشروع: c.project.name,
    "القيمة الإجمالية (ج.م)": Number(c.totalValue),
    "انتهاء الضمان": format(c.guaranteeExpiryDate, "yyyy-MM-dd"),
    الحالة: c.status,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(lawsuitRows),
    "الدعاوى المتداولة"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(contractRows),
    "العقود السارية"
  );

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="NJD_Executive_Report.xlsx"',
    },
  });
}
