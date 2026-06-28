import { LegalNoticeDeliveryStatus } from "@prisma/client";
import {
  getManagerEmails,
  notifyAssignmentNonBlocking,
  sendAssignmentEmail,
  sendCriticalAlertEmail,
  sendExpenseDecisionEmail,
  sendExpenseRequestEmail,
  sendExpertsReferralManagerEmail,
  sendManagerUpdateEmail,
  sendNoticeDeliveryEscalationAlert,
  sendSessionOutcomeManagerEmail,
} from "@/lib/email";

type LawyerContact = { id: string; email: string; name: string };

function runInBackground(task: () => Promise<void>): void {
  void task().catch((error) => console.error("[Email] Background notification failed:", error));
}

export function notifyIfLawyerAssigned(
  previousLawyerId: string | null | undefined,
  nextLawyerId: string,
  lawyer: LawyerContact,
  dispatch: (lawyer: LawyerContact) => void
): void {
  if (!nextLawyerId || previousLawyerId === nextLawyerId) return;
  dispatch(lawyer);
}

// ─── Phase 1: Downward assignment routing ───────────────────────────────────

export function notifyLawsuitAssignmentNonBlocking(
  lawyer: LawyerContact,
  caseNumber: string,
  year: number,
  courtName: string,
  opponentName: string,
  isAtExperts = false,
  expertOffice?: string | null
): void {
  notifyAssignmentNonBlocking(
    lawyer,
    isAtExperts ? "دعوى محالة للخبراء" : "تكليف قضائي جديد",
    isAtExperts
      ? `تم تكليفكم بمتابعة دعوى رقم <strong>${caseNumber}/${year}</strong> — محالة لـ <strong>${expertOffice ?? "مصلحة الخبراء"}</strong>.`
      : `تم تكليفكم بمتابعة دعوى رقم <strong>${caseNumber}</strong> لسنة <strong>${year}</strong> — ${courtName} ضد ${opponentName}.`,
    `⚖️ تكليف قضائي جديد: دعوى رقم ${caseNumber}`
  );
}

export function notifyProsecutionAssignmentNonBlocking(
  lawyer: LawyerContact,
  policeStation: string,
  caseNumber: string,
  year: number,
  issueType: string,
  clientName: string
): void {
  notifyAssignmentNonBlocking(
    lawyer,
    "تكليف بمحضر/جنحة",
    `تم تكليفكم بمتابعة محضر رقم <strong>${caseNumber}/${year}</strong> — ${issueType} — ${clientName}.`,
    `🚨 تكليف بمحضر/جنحة جديدة: بجهة ${policeStation}`
  );
}

/** GAFI tasks have no assignedLawyerId — notify managers of new corporate task */
export function notifyGafiTaskCreatedNonBlocking(title: string, deadline: Date): void {
  runInBackground(async () => {
    const managerEmails = await getManagerEmails();
    if (!managerEmails.length) return;

    const details = `
      <p style="margin: 0 0 16px;">تم إنشاء مهمة مؤسسية جديدة:</p>
      <p style="margin: 0 0 8px;"><strong>${title}</strong></p>
      <p style="margin: 0;">الموعد النهائي: <strong>${deadline.toLocaleDateString("ar-EG")}</strong></p>
    `;

    await sendCriticalAlertEmail(
      managerEmails,
      `🏢 تكليف بمهمة مؤسسية: ${title}`,
      details
    );
  });
}

export function notifyLegalTaskAssignmentNonBlocking(
  lawyer: LawyerContact,
  title: string,
  deadline: Date
): void {
  notifyAssignmentNonBlocking(
    lawyer,
    "مهمة إدارية",
    `تم تكليفكم بمتابعة "<strong>${title}</strong>" — الموعد النهائي: ${deadline.toLocaleDateString("ar-EG")}.`,
    `📋 تكليف بمهمة إدارية: ${title}`
  );
}

export function notifyLegalNoticeAssignmentNonBlocking(
  lawyer: LawyerContact,
  opponentName: string,
  noticeType: string,
  bailiffOffice: string
): void {
  notifyAssignmentNonBlocking(
    lawyer,
    `إنذار: ${noticeType}`,
    `تم تكليفكم بمتابعة إنذار رسمي ضد <strong>${opponentName}</strong> لدى <strong>${bailiffOffice}</strong>.`,
    `📜 تكليف بإنذار رسمي ضد: ${opponentName}`
  );
}

export function notifyPowerOfAttorneyAssignmentNonBlocking(
  lawyer: LawyerContact,
  poaNumber: string,
  clientName: string,
  type: string
): void {
  notifyAssignmentNonBlocking(
    lawyer,
    "توكيل رسمي",
    `تم تكليفكم بمتابعة توكيل رقم <strong>${poaNumber}</strong> — ${clientName} — ${type}.`,
    `🖋️ استلام توكيل جديد: رقم ${poaNumber}`
  );
}

// ─── Phase 2: Upward management alerts ──────────────────────────────────────

export function notifySessionOutcomeManagersNonBlocking(
  lawyerName: string,
  caseNumber: string,
  year: number
): void {
  runInBackground(async () => {
    const managerEmails = await getManagerEmails();
    if (!managerEmails.length) return;
    await sendSessionOutcomeManagerEmail(managerEmails, lawyerName, caseNumber, year);
  });
}

export function notifyNoticeDeliveryManagersNonBlocking(opponentName: string): void {
  runInBackground(async () => {
    const managerEmails = await getManagerEmails();
    if (!managerEmails.length) return;
    await sendNoticeDeliveryEscalationAlert(managerEmails, opponentName);
  });
}

export function notifyNoticeDeliveryChangeIfNeeded(
  previousStatus: LegalNoticeDeliveryStatus,
  newStatus: LegalNoticeDeliveryStatus,
  opponentName: string
): void {
  if (previousStatus === newStatus || newStatus === LegalNoticeDeliveryStatus.PENDING) {
    return;
  }
  if (
    newStatus === LegalNoticeDeliveryStatus.DELIVERED_SUCCESS ||
    newStatus === LegalNoticeDeliveryStatus.DELIVERED_REFUSED
  ) {
    notifyNoticeDeliveryManagersNonBlocking(opponentName);
    return;
  }
  runInBackground(async () => {
    const managerEmails = await getManagerEmails();
    if (!managerEmails.length) return;
    const { getDeliveryStatusLabelAr } = await import("@/lib/notices/delivery-labels");
    await sendManagerUpdateEmail(
      managerEmails,
      "النظام",
      `تحديث حالة إنذار ضد ${opponentName}: ${getDeliveryStatusLabelAr(newStatus)}`
    );
  });
}

export function notifyExpertsReferralIfNeeded(
  wasAtExperts: boolean,
  isAtExperts: boolean,
  caseNumber: string,
  year: number
): void {
  if (wasAtExperts || !isAtExperts) return;
  runInBackground(async () => {
    const managerEmails = await getManagerEmails();
    if (!managerEmails.length) return;
    await sendExpertsReferralManagerEmail(managerEmails, caseNumber, year);
  });
}

// ─── Phase 3: Financial workflow ────────────────────────────────────────────

export function notifyExpenseRequestManagersNonBlocking(
  lawyerName: string,
  amount: number,
  description: string
): void {
  runInBackground(async () => {
    const managerEmails = await getManagerEmails();
    if (!managerEmails.length) return;
    await sendExpenseRequestEmail(managerEmails, lawyerName, amount, description);
  });
}

export function notifyExpenseDecisionNonBlocking(
  requester: LawyerContact,
  amount: number,
  approved: boolean
): void {
  if (!requester.email) return;
  runInBackground(async () => {
    await sendExpenseDecisionEmail(requester.email, requester.name, amount, approved);
  });
}

// ─── Phase 4 helpers (daily cron) ─────────────────────────────────────────

export function buildTomorrowAgendaBodyHtml(
  lawyerName: string,
  sessions: Array<{
    caseNumber: string;
    year: number;
    courtName: string;
    requiredAction: string;
  }>,
  tasks: Array<{ title: string; description: string | null }>
): string {
  const sessionBlock =
    sessions.length > 0
      ? `<p style="margin: 16px 0 8px; font-weight: bold;">⚖️ جلسات المحكمة:</p>
         <ul style="margin: 0; padding-right: 24px;">${sessions
           .map(
             (s) =>
               `<li style="margin-bottom: 10px;">
                 دعوى <strong>${s.caseNumber}/${s.year}</strong> — ${s.courtName}<br />
                 المطلوب: ${s.requiredAction}
               </li>`
           )
           .join("")}</ul>`
      : "";

  const taskBlock =
    tasks.length > 0
      ? `<p style="margin: 16px 0 8px; font-weight: bold;">📋 مهام إدارية:</p>
         <ul style="margin: 0; padding-right: 24px;">${tasks
           .map(
             (task) =>
               `<li style="margin-bottom: 8px;">
                 <strong>${task.title}</strong>${task.description ? `<br />${task.description}` : ""}
               </li>`
           )
           .join("")}</ul>`
      : "";

  return `
    <p style="margin: 0 0 16px;">أ. <strong>${lawyerName}</strong>،</p>
    <p style="margin: 0 0 16px;">إليكم أجندة مهامكم ليوم الغد:</p>
    ${sessionBlock}
    ${taskBlock}
    <p style="margin: 16px 0 0;">برجاء تسجيل الدخول على النظام للاطلاع على التفاصيل.</p>
  `;
}

export async function sendLawyerTomorrowAgendaEmail(
  to: string,
  lawyerName: string,
  bodyHtml: string
): Promise<{ success: boolean; message: string }> {
  return sendAssignmentEmail(
    to,
    lawyerName,
    "📅 أجندة مهامك ليوم الغد",
    bodyHtml,
    "📅 أجندة مهامك ليوم الغد"
  );
}
