import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { requireApiSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { canDownloadContract } from "@/lib/rbac";
import { resolveContractFilePath } from "@/lib/uploads";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireApiSession();
  if ("response" in gate) return gate.response;
  const session = gate.session;

  const { id } = await params;

  const contract = await prisma.contract.findUnique({
    where: { id },
  });

  if (!contract) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canDownloadContract(session.user.role, session.user.id, [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await logActivity(session.user.id, "DOWNLOAD", "Contract", id);

  try {
    const filePath = await resolveContractFilePath(contract.fileUrl);
    const buffer = await readFile(filePath);
    const fileName = path.basename(contract.fileUrl);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
