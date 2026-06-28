import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import {
  buildLegalEmailTemplate,
  buildMissionEmailBodyHtml,
  sendEmail,
} from "@/lib/email";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const gate = await requireApiAnyPermission(["PROSECUTIONS_CREATE", "PROSECUTIONS_UPDATE"]);
  if ("response" in gate) return gate.response;
  const session = gate.session;

  let body: { policeStation?: string; prosecutionIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { policeStation, prosecutionIds } = body;
  if (!policeStation || !prosecutionIds?.length) {
    return NextResponse.json({ error: "Missing policeStation or prosecutionIds" }, { status: 400 });
  }

  const prosecutions = await prisma.prosecution.findMany({
    where: {
      id: { in: prosecutionIds },
      policeStation,
    },
    include: { assignedLawyer: true },
    orderBy: [{ year: "desc" }, { caseNumber: "asc" }],
  });

  if (!prosecutions.length) {
    return NextResponse.json({ error: "No prosecutions found for this location" }, { status: 404 });
  }

  const byLawyer = new Map<string, typeof prosecutions>();
  for (const prosecution of prosecutions) {
    const list = byLawyer.get(prosecution.assignedLawyerId) ?? [];
    list.push(prosecution);
    byLawyer.set(prosecution.assignedLawyerId, list);
  }

  const results: Array<{ lawyerName: string; success: boolean; message: string }> = [];

  for (const cases of byLawyer.values()) {
    const lawyer = cases[0].assignedLawyer;

    if (!lawyer.email?.trim()) {
      results.push({
        lawyerName: lawyer.name,
        success: false,
        message: "Lawyer has no email address",
      });
      continue;
    }

    const subject = `🚗 مأمورية مجمعة - نيابة/قسم ${policeStation}`;
    const bodyHtml = buildMissionEmailBodyHtml(lawyer.name, policeStation, cases);
    const sendResult = await sendEmail({
      to: lawyer.email.trim(),
      subject,
      html: buildLegalEmailTemplate(subject, bodyHtml),
    });

    results.push({
      lawyerName: lawyer.name,
      success: sendResult.success,
      message: sendResult.message,
    });
  }

  const sent = results.filter((r) => r.success).length;
  const firstFailure = results.find((r) => !r.success);

  if (sent > 0) {
    await logActivity(session.user.id, "SEND_MISSION", "Prosecution", policeStation);
  }

  const payload = {
    success: sent > 0,
    sent,
    total: results.length,
    results,
    error: sent > 0 ? undefined : firstFailure?.message ?? "No emails could be sent",
  };

  if (sent === 0) {
    return NextResponse.json(payload, { status: 422 });
  }

  return NextResponse.json(payload);
}
