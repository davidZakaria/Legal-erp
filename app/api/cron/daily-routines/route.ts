import { NextRequest, NextResponse } from "next/server";
import { isManagerOrAbove } from "@/lib/rbac";
import { isPasswordChangeRequired, getAuthenticatedSession } from "@/lib/auth-guards";
import { runDailyRoutines } from "@/lib/daily-routines";

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

  const result = await runDailyRoutines();

  return NextResponse.json({
    success: true,
    reminders: {
      sent: result.reminders.sent,
      total: result.reminders.total,
    },
    guarantees: {
      sent: result.guarantees.sent,
      total: result.guarantees.total,
      message: result.guarantees.message,
    },
    corporate: {
      sent: result.corporate.sent,
      total: result.corporate.total,
      message: result.corporate.message,
    },
  });
}
