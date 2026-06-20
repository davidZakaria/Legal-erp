"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function TriggerWhatsAppRemindersButton({ canTrigger }: { canTrigger: boolean }) {
  const t = useTranslations("litigation");
  const [loading, setLoading] = useState(false);

  if (!canTrigger) return null;

  const handleTrigger = async () => {
    setLoading(true);
    const toastId = toast.loading(t("whatsappTriggerLoading"));

    try {
      const response = await fetch("/api/cron/whatsapp-reminders");
      const data = (await response.json().catch(() => ({}))) as {
        sent?: number;
        total?: number;
        error?: string;
      };

      if (!response.ok) {
        toast.error(data.error ?? t("whatsappTriggerError"), { id: toastId });
        return;
      }

      toast.success(
        t("whatsappTriggerSuccess", {
          sent: data.sent ?? 0,
          total: data.total ?? 0,
        }),
        { id: toastId }
      );
    } catch {
      toast.error(t("whatsappTriggerError"), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="gap-2 border-green-200 bg-green-50/50 hover:bg-green-50"
      onClick={handleTrigger}
      disabled={loading}
    >
      <MessageCircle className="h-4 w-4 text-green-600" />
      {loading ? t("whatsappTriggerLoading") : t("whatsappTrigger")}
    </Button>
  );
}
