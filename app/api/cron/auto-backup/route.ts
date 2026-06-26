import { NextRequest, NextResponse } from "next/server";
import { BackupType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildBackupFileName,
  exportDatabaseJson,
  stringifyBackup,
} from "@/lib/backup";
import { getSuperAdminEmails, sendBackupEmail } from "@/lib/email";

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  return Boolean(authHeader && authHeader === expected);
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await exportDatabaseJson();
  const fileName = buildBackupFileName();
  const jsonContent = stringifyBackup(payload);

  const recipients = await getSuperAdminEmails();
  if (!recipients.length) {
    return NextResponse.json({ error: "No super admin emails configured" }, { status: 500 });
  }

  const [primary, ...bccRest] = recipients;
  const emailResult = await sendBackupEmail({
    to: primary,
    bcc: bccRest.length ? bccRest : undefined,
    fileName,
    jsonContent,
  });

  await prisma.backupLog.create({
    data: {
      fileName,
      type: BackupType.AUTO,
    },
  });

  return NextResponse.json({
    success: emailResult.success,
    fileName,
    message: emailResult.message,
  });
}
