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
    agenda: {
      sent: result.agenda.sent,
      totalLawyers: result.agenda.totalLawyers,
      totalSessions: result.agenda.totalSessions,
      totalTasks: result.agenda.totalTasks,
    },
    riskRadar: {
      sent: result.riskRadar.sent,
      totalContracts: result.riskRadar.totalContracts,
      totalCompanies: result.riskRadar.totalCompanies,
      message: result.riskRadar.message,
    },
    bailiffNotices: {
      sent: result.bailiffNotices.sent,
      total: result.bailiffNotices.total,
    },
    reminders: result.reminders,
    guarantees: result.guarantees,
    corporate: result.corporate,
  });
}
