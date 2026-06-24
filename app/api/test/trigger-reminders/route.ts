import { NextRequest, NextResponse } from "next/server";
import { processCourtSessionReminders } from "@/lib/reminders";

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processCourtSessionReminders();

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>NJD Legal ERP - Email Reminders</title>
      <style>
        body { font-family: system-ui; padding: 2rem; max-width: 800px; margin: 0 auto; }
        h1 { color: #1e40af; }
        .success { color: green; }
        .error { color: red; }
        pre { background: #f4f4f5; padding: 1rem; border-radius: 8px; overflow: auto; }
      </style>
    </head>
    <body>
      <h1>⚖️ تذكيرات الإيميل — NJD Legal ERP</h1>
      <p><strong>تم الإرسال:</strong> ${result.sent} / ${result.total}</p>
      <pre>${JSON.stringify(result.results, null, 2)}</pre>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
