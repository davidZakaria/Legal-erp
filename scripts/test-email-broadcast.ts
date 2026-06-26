/**
 * Sends sample emails to the David test accounts using the same templates as production.
 * Run: npx tsx scripts/test-email-broadcast.ts
 */
import {
  sendAssignmentEmail,
  sendBroadcastEmail,
  sendCriticalAlertEmail,
} from "../lib/email";

const LAWYER_EMAIL = "david@newjerseyegypt.com";
const MANAGER_EMAIL = "davidsamiii97@gmail.com";

async function main() {
  console.log("Sending ERP email matrix test...\n");

  const assignment = await sendAssignmentEmail(
    LAWYER_EMAIL,
    "David — Test Lawyer",
    "🔔 تكليف قانوني جديد — اختبار النظام",
    `هذه رسالة اختبار من نظام NJD Legal ERP.<br /><br />
    <strong>متطلبات اختبار المحامي:</strong>
    <ul style="margin: 8px 0; padding-right: 20px;">
      <li>استلام إشعار التكليف (هذه الرسالة — رأس أزرق)</li>
      <li>تسجيل الدخول: david@newjerseyegypt.com / password123</li>
      <li>متابعة الدعاوى والجلسات والنيابات المكلف بها</li>
      <li>إثبات قرار المحكمة بعد الجلسات</li>
    </ul>`
  );
  console.log("1. Assignment (lawyer):", assignment.success ? "✓ sent" : `✗ ${assignment.message}`);

  const alert = await sendCriticalAlertEmail(
    [MANAGER_EMAIL],
    "🚨 اختبار إنذار إداري — نظام NJD Legal ERP",
    `<p>هذه رسالة اختبار للإنذارات الحرجة (رأس أحمر).</p>
    <ul style="margin: 8px 0; padding-right: 20px;">
      <li>تسجيل الدخول: davidsamiii97@gmail.com / password123</li>
      <li>اختبار البث العام من أيقونة الإشعارات</li>
      <li>استلام تنبيهات الضمانات والحوكمة المؤسسية</li>
      <li>مراجعة لوحة القيادة وتصدير التقارير</li>
    </ul>`
  );
  console.log("2. Critical alert (manager):", alert.success ? "✓ sent" : `✗ ${alert.message}`);

  const broadcast = await sendBroadcastEmail(
    [LAWYER_EMAIL, MANAGER_EMAIL],
    "📢 اختبار البث العام — NJD Legal ERP",
    `مرحباً،

هذه رسالة اختبار للبث العام (رأس ذهبي) كما يرسلها مدير النظام من داخل ERP.

متطلبات التحقق:
• وصول الرسالة إلى david@newjerseyegypt.com (محامٍ)
• وصول الرسالة إلى davidsamiii97@gmail.com (مدير قانوني)
• التحقق من التنسيق العربي RTL والهوية البصرية

إذا وصلتكم هذه الرسالة، فإعداد SMTP يعمل بنجاح.

— فريق NJD Legal ERP`
  );
  console.log("3. Broadcast (both):", broadcast.success ? "✓ sent" : `✗ ${broadcast.message}`);

  const allOk = assignment.success && alert.success && broadcast.success;
  console.log(allOk ? "\n✓ All test emails dispatched." : "\n⚠ Some emails failed — check SMTP / Gmail app password.");
  process.exit(allOk ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
