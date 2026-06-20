import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isManagerOrAbove } from "@/lib/rbac";
import { processCourtSessionReminders } from "@/lib/reminders";

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader && authHeader === expected) {
    return true;
  }

  const session = await auth();
  return Boolean(session?.user && isManagerOrAbove(session.user.role));
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processCourtSessionReminders();

  return NextResponse.json({
    success: true,
    sent: result.sent,
    total: result.total,
    results: result.results,
  });
}
