import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const session = await auth();
  const thirtyDaysFromNow = addDays(new Date(), 30);
  const tomorrow = addDays(new Date(), 1);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const [expiringContracts, sessionsTomorrow, prosecutions] = await Promise.all([
    prisma.contract.count({
      where: { guaranteeExpiryDate: { lte: thirtyDaysFromNow } },
    }),
    prisma.courtSession.count({
      where: {
        sessionDate: { gte: tomorrow, lte: tomorrowEnd },
        status: "PENDING",
      },
    }),
    prisma.prosecution.count(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-start">
        {t("welcome", { name: session?.user?.name ?? "" })}
      </h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("contractsExpiring")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{expiringContracts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("sessionsTomorrow")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{sessionsTomorrow}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("openProsecutions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{prosecutions}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
