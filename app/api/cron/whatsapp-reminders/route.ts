import { NextRequest, NextResponse } from "next/server";
import { isManagerOrAbove } from "@/lib/rbac";
import { isPasswordChangeRequired, getAuthenticatedSession } from "@/lib/auth-guards";
import { processCourtSessionReminders } from "@/lib/reminders";

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader && authHeader === expected) {
    return true;
  }

  const session = await getAuthenticatedSession();
  if (!session || isPasswordChangeRequired(session)) {
    return false;
  }
  return isManagerOrAbove(session.user.role);
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
