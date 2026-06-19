export async function sendWhatsAppMessage(
  phone: string,
  text: string
): Promise<{ success: boolean; message: string }> {
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL ?? "http://localhost:3999/mock";

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, text }),
    });

    if (!response.ok) {
      console.log("[WhatsApp Mock]", { phone, text });
      return {
        success: true,
        message: "Mock sent (webhook unavailable)",
      };
    }

    return {
      success: true,
      message: "Message sent successfully",
    };
  } catch {
    console.log("[WhatsApp Mock]", { phone, text });
    return {
      success: true,
      message: "Mock sent (webhook unavailable)",
    };
  }
}

export function buildReminderMessage(params: {
  lawyerName: string;
  caseNumber: string;
  year: number;
  courtName: string;
  requiredAction: string;
}): string {
  return `⚖️ *تذكير هام بموعد جلسة غداً* ⚖️
أ. ${params.lawyerName}
رقم الدعوى: ${params.caseNumber} لسنة ${params.year}
المحكمة: ${params.courtName}
المطلوب بالجلسة: ${params.requiredAction}
برجاء الحضور وتأكيد (تأييد ما تم بالجلسة) على النظام فور الانتهاء.`;
}
