import { NextRequest, NextResponse } from "next/server";
import { processCourtSessionReminders } from "@/lib/reminders";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processCourtSessionReminders();

  return NextResponse.json({
    sent: result.sent,
    total: result.total,
    results: result.results,
  });
}
