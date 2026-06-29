#!/usr/bin/env tsx
/**
 * Run on VPS via cron (daily at 2 AM):
 * 0 2 * * * cd /var/www/legal-erp && /usr/bin/npx tsx scripts/run-auto-backup.ts >> /var/log/legal-erp-backup.log 2>&1
 *
 * Or trigger the HTTP endpoint:
 * curl -s -H "Authorization: Bearer $CRON_SECRET" https://legal-njd.com/api/cron/auto-backup
 */

import { runDailyAutoBackup } from "../lib/backup-engine";
import { getSuperAdminEmails, sendBackupEmail } from "../lib/email";
import fs from "fs/promises";

async function main() {
  console.log(`[${new Date().toISOString()}] Starting daily auto-backup...`);

  const result = await runDailyAutoBackup();
  console.log(
    `Backup created: ${result.fileName} (${result.size}, ${result.files} files, log ${result.logId})`
  );

  const zipBuffer = await fs.readFile(result.filePath);
  const recipients = await getSuperAdminEmails();

  if (!recipients.length) {
    console.warn("No super admin emails — backup saved on disk only.");
    return;
  }

  const [primary, ...bccRest] = recipients;
  const emailResult = await sendBackupEmail({
    to: primary,
    bcc: bccRest.length ? bccRest : undefined,
    fileName: result.fileName,
    zipContent: zipBuffer,
    preview: result.preview,
  });

  console.log(`Email ${emailResult.success ? "sent" : "failed"}: ${emailResult.message ?? ""}`);
}

main().catch((error) => {
  console.error("Auto-backup failed:", error);
  process.exit(1);
});
