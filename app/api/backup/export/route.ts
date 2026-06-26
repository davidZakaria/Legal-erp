import { NextResponse } from "next/server";
import { Role, BackupType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildBackupFileName, exportDatabaseJson, stringifyBackup } from "@/lib/backup";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await exportDatabaseJson();
  const fileName = buildBackupFileName();
  const json = stringifyBackup(payload);

  await prisma.backupLog.create({
    data: {
      fileName,
      type: BackupType.MANUAL,
    },
  });

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
