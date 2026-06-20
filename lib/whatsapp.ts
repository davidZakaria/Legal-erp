export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, "");

  if (cleaned.startsWith("00")) {
    cleaned = `+${cleaned.slice(2)}`;
  }

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  if (cleaned.startsWith("0")) {
    return `+20${cleaned.slice(1)}`;
  }

  if (cleaned.startsWith("20")) {
    return `+${cleaned}`;
  }

  return `+20${cleaned}`;
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

برجاء الحضور وتأكيد (إثبات قرار المحكمة) على النظام فور الانتهاء.`;
}

export async function sendWhatsAppMessage(
  toPhone: string,
  message: string
): Promise<{ success: boolean; message: string }> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_TOKEN;
  const to = normalizePhoneNumber(toPhone);

  if (!apiUrl || !token) {
    console.error("[WhatsApp] Missing WHATSAPP_API_URL or WHATSAPP_TOKEN");
    return { success: false, message: "WhatsApp API is not configured" };
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to, body: message }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error("[WhatsApp] Send failed:", {
        to,
        status: response.status,
        error: errorBody,
      });
      return {
        success: false,
        message: `WhatsApp API returned ${response.status}`,
      };
    }

    console.log("[WhatsApp] Message sent successfully:", { to });
    return { success: true, message: "Message sent successfully" };
  } catch (error) {
    console.error("[WhatsApp] Network error:", error);
    return {
      success: false,
      message: "Failed to reach WhatsApp API",
    };
  }
}
