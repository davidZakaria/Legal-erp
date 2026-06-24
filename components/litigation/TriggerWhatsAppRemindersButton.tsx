"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function TriggerWhatsAppRemindersButton({ canTrigger }: { canTrigger: boolean }) {
  const t = useTranslations("litigation");
  const [loading, setLoading] = useState(false);

  if (!canTrigger) return null;

  const handleTrigger = async () => {
    setLoading(true);
    const toastId = toast.loading(t("emailTriggerLoading"));

    try {
      const response = await fetch("/api/cron/whatsapp-reminders");
      const data = (await response.json().catch(() => ({}))) as {
        sent?: number;
        total?: number;
        error?: string;
      };

      if (!response.ok) {
        toast.error(data.error ?? t("emailTriggerError"), { id: toastId });
        return;
      }

      toast.success(
        t("emailTriggerSuccess", {
          sent: data.sent ?? 0,
          total: data.total ?? 0,
        }),
        { id: toastId }
      );
    } catch {
      toast.error(t("emailTriggerError"), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleTrigger} disabled={loading}>
      <Mail className="h-4 w-4 me-2 text-blue-600" />
      {loading ? t("emailTriggerLoading") : t("emailTrigger")}
    </Button>
  );
}
