"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/crud/DeleteConfirmDialog";
import {
  clearAllOperationalData,
  type fetchOperationalDataCounts,
} from "@/app/actions/admin/clearOperationalData";

type Counts = NonNullable<Awaited<ReturnType<typeof fetchOperationalDataCounts>>>;

export function ClearOperationalDataCard({ counts }: { counts: Counts }) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const total =
    counts.gafiTasks +
    counts.legalTasks +
    counts.powerOfAttorneys +
    counts.lawsuits +
    counts.contracts +
    counts.prosecutions +
    counts.legalNotices +
    counts.expenses;

  const handleConfirm = async () => {
    setPending(true);
    try {
      const result = await clearAllOperationalData("CLEAR");
      if (result.success) {
        toast.success(t("clearOperationalDataSuccess"));
        setOpen(false);
        router.refresh();
        return;
      }
      toast.error(result.error ?? t("clearOperationalDataError"));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Card className="mt-8 border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            {t("clearOperationalDataTitle")}
          </CardTitle>
          <CardDescription className="text-start leading-relaxed">
            {t("clearOperationalDataDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("clearOperationalDataCounts", {
              total,
              gafi: counts.gafiTasks,
              tasks: counts.legalTasks,
              poas: counts.powerOfAttorneys,
              lawsuits: counts.lawsuits,
              contracts: counts.contracts,
            })}
          </p>
          <Button
            type="button"
            variant="destructive"
            disabled={total === 0}
            onClick={() => setOpen(true)}
          >
            {t("clearOperationalDataButton")}
          </Button>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        itemName="CLEAR"
        title={t("clearOperationalDataConfirmTitle")}
        description={t("clearOperationalDataConfirmDescription")}
        isPending={pending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
