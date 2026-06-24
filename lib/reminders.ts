import { processDailySessionReminders } from "@/lib/daily-routines";

/** @deprecated Use runDailyRoutines from lib/daily-routines instead */
export async function processCourtSessionReminders() {
  return processDailySessionReminders();
}
