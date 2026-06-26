import nodemailer from "nodemailer";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type EmailResult = { success: boolean; message: string };

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function getFromAddress(): string | null {
  return process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? null;
}

function buildEmailTemplate(
  title: string,
  bodyHtml: string,
  headerColor: string
): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0;">
  <div dir="rtl" style="font-family: Arial, sans-serif; text-align: right; background-color: #f8fafc; padding: 20px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; margin: 0 auto;">
      <tr>
        <td style="background-color: ${headerColor}; color: #ffffff; padding: 20px 24px; border-radius: 8px 8px 0 0; font-size: 18px; font-weight: bold;">
          نظام الإدارة القانونية - New Jersey Developments
        </td>
      </tr>
      <tr>
        <td style="background-color: #ffffff; border: 1px solid #e2e8f0; border-top: none; padding: 28px 24px; border-radius: 0 0 8px 8px;">
          <h1 style="margin: 0 0 20px; font-size: 20px; color: #1e293b;">${title}</h1>
          <div style="color: #334155; font-size: 15px; line-height: 1.8;">
            ${bodyHtml}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 8px 0; color: #64748b; font-size: 12px; text-align: center;">
          هذه رسالة آلية من النظام، يرجى عدم الرد.
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

async function sendMailMessage(options: {
  to: string;
  bcc?: string[];
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: string | Buffer }>;
}): Promise<EmailResult> {
  const transporter = createTransporter();
  const from = getFromAddress();

  if (!transporter || !from) {
    console.error("[Email] Missing SMTP configuration (SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM)");
    return { success: false, message: "Email service is not configured" };
  }

  try {
    await transporter.sendMail({
      from,
      to: options.to,
      bcc: options.bcc?.length ? options.bcc : undefined,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });
    console.log("[Email] Sent successfully:", { to: options.to, subject: options.subject });
    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.error("[Email] Send failed:", { to: options.to, subject: options.subject, error });
    return { success: false, message: "Failed to send email" };
  }
}

/** Blue header — direct assignments & session reminders */
export async function sendAssignmentEmail(
  to: string,
  lawyerName: string,
  entityName: string,
  details: string,
  subject = "🔔 تكليف قانوني جديد"
): Promise<EmailResult> {
  const bodyHtml = `
    <p style="margin: 0 0 16px;">عزيزي أ. <strong>${lawyerName}</strong>،</p>
    <p style="margin: 0 0 16px;"><strong>${entityName}</strong></p>
    <p style="margin: 0 0 16px;">${details}</p>
    <p style="margin: 0;">برجاء تسجيل الدخول على النظام لمراجعة التفاصيل والبدء في العمل.</p>
  `;

  return sendMailMessage({
    to,
    subject,
    html: buildEmailTemplate(entityName, bodyHtml, "#1e3a8a"),
  });
}

/** Green header — lawyer completions reported upward to managers */
export async function sendManagerUpdateEmail(
  managerEmailsArray: string[],
  lawyerName: string,
  actionDone: string
): Promise<EmailResult> {
  const recipients = [...new Set(managerEmailsArray.filter(Boolean))];
  if (!recipients.length) {
    return { success: false, message: "No manager email addresses configured" };
  }

  const subject = `✅ إنجاز مهمة: ${actionDone}`;
  const bodyHtml = `
    <p style="margin: 0 0 16px;">تحية طيبة،</p>
    <p style="margin: 0 0 16px;">قام أ. <strong>${lawyerName}</strong> بـ:</p>
    <p style="margin: 0 0 16px; padding: 12px 16px; background-color: #f0fdf4; border-right: 4px solid #166534; border-radius: 4px;">
      ${actionDone}
    </p>
    <p style="margin: 0;">يمكنكم مراجعة التفاصيل الكاملة على النظام.</p>
  `;

  const [primary, ...bccRest] = recipients;
  return sendMailMessage({
    to: primary,
    bcc: bccRest.length ? bccRest : undefined,
    subject,
    html: buildEmailTemplate("تحديث من فريق المحاماة", bodyHtml, "#166534"),
  });
}

/** Gold header — company-wide broadcasts via BCC */
export async function sendBroadcastEmail(
  allEmailsArray: string[],
  subject: string,
  message: string
): Promise<EmailResult> {
  const recipients = [...new Set(allEmailsArray.filter(Boolean))];
  if (!recipients.length) {
    return { success: false, message: "No recipient email addresses found" };
  }

  const bodyHtml = `
    <p style="margin: 0 0 16px; white-space: pre-wrap;">${message}</p>
    <p style="margin: 0; color: #64748b; font-size: 13px;">— الإدارة القانونية، New Jersey Developments</p>
  `;

  const [primary, ...bccRest] = recipients;
  return sendMailMessage({
    to: primary,
    bcc: bccRest.length ? bccRest : undefined,
    subject,
    html: buildEmailTemplate(subject, bodyHtml, "#ca8a04"),
  });
}

/** Red header — critical financial / guarantee alerts */
export async function sendCriticalAlertEmail(
  managerEmailsArray: string[],
  alertTitle: string,
  details: string
): Promise<EmailResult> {
  const recipients = [...new Set(managerEmailsArray.filter(Boolean))];
  if (!recipients.length) {
    return { success: false, message: "No manager email addresses configured" };
  }

  const bodyHtml = `
    <p style="margin: 0 0 16px; font-weight: bold; color: #b91c1c;">${alertTitle}</p>
    <div style="margin: 0;">${details}</div>
    <p style="margin: 16px 0 0;">يرجى اتخاذ الإجراء اللازم في أقرب وقت.</p>
  `;

  const [primary, ...bccRest] = recipients;
  return sendMailMessage({
    to: primary,
    bcc: bccRest.length ? bccRest : undefined,
    subject: alertTitle,
    html: buildEmailTemplate(alertTitle, bodyHtml, "#b91c1c"),
  });
}

export async function getManagerEmails(): Promise<string[]> {
  const managers = await prisma.user.findMany({
    where: { role: { in: [Role.LEGAL_MANAGER, Role.SUPER_ADMIN] } },
    select: { email: true },
  });
  return managers.map((manager) => manager.email);
}

export function notifyAssignmentNonBlocking(
  lawyer: { email: string; name: string },
  entityName: string,
  details: string
): void {
  void sendAssignmentEmail(lawyer.email, lawyer.name, entityName, details).catch((error) =>
    console.error("[Email] Assignment notification failed:", error)
  );
}

export function notifyManagersNonBlocking(lawyerName: string, actionDone: string): void {
  void (async () => {
    try {
      const managerEmails = await getManagerEmails();
      await sendManagerUpdateEmail(managerEmails, lawyerName, actionDone);
    } catch (error) {
      console.error("[Email] Manager update notification failed:", error);
    }
  })();
}

export function buildLegalEmailTemplate(title: string, bodyHtml: string): string {
  return buildEmailTemplate(title, bodyHtml, "#1e3a8a");
}

export function buildSessionReminderBodyHtml(
  lawyerName: string,
  sessions: Array<{
    caseNumber: string;
    year: number;
    courtName: string;
    requiredAction: string;
  }>
): string {
  const listItems = sessions
    .map(
      (session) =>
        `<li style="margin-bottom: 12px;">
          <strong>رقم الدعوى:</strong> ${session.caseNumber} لسنة ${session.year}<br />
          <strong>المحكمة:</strong> ${session.courtName}<br />
          <strong>المطلوب بالجلسة:</strong> ${session.requiredAction}
        </li>`
    )
    .join("");

  return `
    <ul style="margin: 0; padding-right: 24px; color: #334155;">
      ${listItems}
    </ul>
  `;
}

export function buildMissionEmailBodyHtml(
  lawyerName: string,
  policeStation: string,
  cases: Array<{
    caseNumber: string;
    year: number;
    issueType: string;
    clientName: string;
  }>
): string {
  const listItems = cases
    .map(
      (item, index) =>
        `<li style="margin-bottom: 10px;">
          ${index + 1}. محضر رقم ${item.caseNumber}/${item.year} — ${item.issueType} — الخصم: ${item.clientName}
        </li>`
    )
    .join("");

  return `
    <p style="margin: 0 0 16px;">أ. <strong>${lawyerName}</strong>،</p>
    <p style="margin: 0 0 16px;">برجاء متابعة المحاضر التالية اليوم في نيابة/قسم <strong>${policeStation}</strong>:</p>
    <ul style="margin: 0 0 16px; padding-right: 24px; color: #334155;">
      ${listItems}
    </ul>
    <p style="margin: 0;">مع تمنياتنا بالتوفيق.</p>
  `;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailResult> {
  return sendMailMessage({ to, subject, html });
}

/** Red header — two-factor authentication OTP */
export async function sendTwoFactorOtpEmail({
  to,
  secondaryEmail,
  otp,
  userName,
}: {
  to: string;
  secondaryEmail?: string | null;
  otp: string;
  userName: string;
}): Promise<EmailResult> {
  const subject = "🔒 رمز التحقق للدخول (2FA) - NJD ERP";
  const bodyHtml = `
    <p style="margin: 0 0 16px;">مرحباً <strong>${userName}</strong>،</p>
    <p style="margin: 0 0 16px;">رمز التحقق الخاص بك للدخول إلى النظام هو:</p>
    <p style="margin: 0 0 16px; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #b91c1c; text-align: center;">${otp}</p>
    <p style="margin: 0 0 16px;">صلاحية الرمز: <strong>10 دقائق</strong>.</p>
    <p style="margin: 0; color: #64748b; font-size: 13px;">إذا لم تطلب هذا الرمز، يرجى تجاهل الرسالة والتواصل مع الإدارة فوراً.</p>
  `;

  const bcc = secondaryEmail?.trim() ? [secondaryEmail.trim()] : undefined;

  const primary = await sendMailMessage({
    to,
    bcc,
    subject,
    html: buildEmailTemplate("رمز التحقق للدخول", bodyHtml, "#b91c1c"),
  });

  if (primary.success) {
    return primary;
  }

  if (secondaryEmail?.trim() && secondaryEmail.trim().toLowerCase() !== to.trim().toLowerCase()) {
    return sendMailMessage({
      to: secondaryEmail.trim(),
      subject,
      html: buildEmailTemplate("رمز التحقق للدخول", bodyHtml, "#b91c1c"),
    });
  }

  return primary;
}

/** Daily auto-backup attachment email */
export async function sendBackupEmail({
  to,
  bcc,
  fileName,
  jsonContent,
}: {
  to: string;
  bcc?: string[];
  fileName: string;
  jsonContent: string;
}): Promise<EmailResult> {
  const subject = "📦 النسخة الاحتياطية الآلية اليومية - NJD ERP";
  const bodyHtml = `
    <p style="margin: 0 0 16px;">تحية طيبة،</p>
    <p style="margin: 0 0 16px;">مرفق النسخة الاحتياطية الآلية اليومية للنظام بتاريخ ${new Date().toLocaleDateString("ar-EG")}.</p>
    <p style="margin: 0; color: #64748b; font-size: 13px;">يرجى حفظ الملف في مكان آمن.</p>
  `;

  return sendMailMessage({
    to,
    bcc,
    subject,
    html: buildEmailTemplate("النسخة الاحتياطية اليومية", bodyHtml, "#1e3a8a"),
    attachments: [{ filename: fileName, content: jsonContent }],
  });
}

export async function getSuperAdminEmails(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: Role.SUPER_ADMIN, isActive: true },
    select: { email: true },
  });
  return admins.map((admin) => admin.email);
}
