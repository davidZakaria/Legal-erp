import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchAgendaItems,
  filterAgendaForToday,
  filterAgendaForWeek,
  type AgendaItem,
} from "@/lib/dashboard/agenda";
import { UnifiedAgendaTabs } from "./UnifiedAgendaTabs";

function serializeItems(items: AgendaItem[]) {
  return items.map((item) => ({
    ...item,
    date: item.date.toISOString(),
  }));
}

export async function UnifiedAgenda() {
  const t = await getTranslations("dashboard");
  const allItems = await fetchAgendaItems();
  const todayItems = serializeItems(filterAgendaForToday(allItems));
  const weekItems = serializeItems(filterAgendaForWeek(allItems));

  const deserializedToday = todayItems.map((item) => ({
    ...item,
    date: new Date(item.date),
  }));
  const deserializedWeek = weekItems.map((item) => ({
    ...item,
    date: new Date(item.date),
  }));

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-lg text-foreground">{t("unifiedAgenda")}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <UnifiedAgendaTabs todayItems={deserializedToday} weekItems={deserializedWeek} />
      </CardContent>
    </Card>
  );
}
