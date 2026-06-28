import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { Role } from "@prisma/client";
import { requireApiSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { resolveSafeBackupPath } from "@/lib/backup-engine";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const gate = await requireApiSession();
  if ("response" in gate) return gate.response;

  if (gate.session.user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: logId } = await context.params;
  if (!logId?.trim()) {
    return NextResponse.json({ error: "Missing backup id" }, { status: 400 });
  }

  const log = await prisma.backupLog.findUnique({ where: { id: logId.trim() } });
  if (!log?.filePath) {
    return NextResponse.json({ error: "Backup not found" }, { status: 404 });
  }

  const safePath = resolveSafeBackupPath(log.filePath);
  if (!safePath) {
    return NextResponse.json({ error: "Invalid backup path" }, { status: 400 });
  }

  try {
    await fs.access(safePath);
  } catch {
    return NextResponse.json({ error: "Backup file missing on disk" }, { status: 404 });
  }

  const stream = createReadStream(safePath);
  const fileName = log.fileName || path.basename(safePath);

  return new NextResponse(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
