import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { canManageProsecutions } from "@/lib/rbac";
import {
  BOUNCED_CHECK_ISSUE_TYPE,
} from "@/lib/prosecutions/constants";
import { buildBouncedCheckReportBuffer } from "@/lib/prosecutions/generateBouncedCheckReport";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageProsecutions(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const prosecution = await prisma.prosecution.findUnique({
    where: { id },
  });

  if (!prosecution) {
    return NextResponse.json({ error: "Prosecution not found" }, { status: 404 });
  }

  if (prosecution.issueType !== BOUNCED_CHECK_ISSUE_TYPE) {
    return NextResponse.json(
      { error: "Only bounced check cases support report generation" },
      { status: 400 }
    );
  }

  await logActivity(session.user.id, "GENERATE_REPORT", "Prosecution", id);

  const buffer = await buildBouncedCheckReportBuffer({
    policeStation: prosecution.policeStation,
    clientName: prosecution.clientName,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="Bounced_Check_Report.docx"',
    },
  });
}
