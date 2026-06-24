"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendSystemBroadcast } from "@/app/actions/sendSystemBroadcast";
import { isManagerOrAbove } from "@/lib/rbac";

export function BroadcastDialog({ userRole }: { userRole: Role }) {
  const t = useTranslations("broadcast");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  if (!isManagerOrAbove(userRole)) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    const formData = new FormData();
    formData.set("subject", subject);
    formData.set("message", message);

    const result = await sendSystemBroadcast(formData);
    setSubmitting(false);

    if (result.success) {
      toast.success(t("success", { count: result.recipientCount ?? 0 }));
      setSubject("");
      setMessage("");
      setOpen(false);
      return;
    }

    toast.error(result.error ?? t("error"));
  };

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Megaphone className="h-4 w-4 me-2" />
        {t("trigger")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="broadcast-subject">{t("subject")}</Label>
              <Input
                id="broadcast-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder={t("subjectPlaceholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="broadcast-message">{t("message")}</Label>
              <Textarea
                id="broadcast-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={t("messagePlaceholder")}
                rows={6}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" variant="destructive" disabled={submitting}>
                {submitting ? t("sending") : t("send")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
