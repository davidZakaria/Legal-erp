import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { runDailyAutoBackup } from "@/lib/backup-engine";
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

  try {
    const result = await runDailyAutoBackup();
    const zipBuffer = await fs.readFile(result.filePath);

    const recipients = await getSuperAdminEmails();
    let emailSent = false;
    let emailMessage = "No super admin emails configured";

    if (recipients.length) {
      const [primary, ...bccRest] = recipients;
      const emailResult = await sendBackupEmail({
        to: primary,
        bcc: bccRest.length ? bccRest : undefined,
        fileName: result.fileName,
        zipContent: zipBuffer,
        preview: result.preview,
      });
      emailSent = emailResult.success;
      emailMessage = emailResult.message ?? "Email sent";
    }

    return NextResponse.json({
      success: true,
      fileName: result.fileName,
      logId: result.logId,
      size: result.size,
      files: result.files,
      preview: result.preview,
      emailSent,
      message: emailMessage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Auto backup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
