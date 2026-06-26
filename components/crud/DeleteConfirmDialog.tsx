"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DeleteConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  title?: string;
  description?: string;
  onConfirm: () => Promise<void>;
  isPending?: boolean;
};

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  itemName,
  title,
  description,
  onConfirm,
  isPending = false,
}: DeleteConfirmDialogProps) {
  const t = useTranslations("common");
  const [typedName, setTypedName] = useState("");

  const trimmedExpected = itemName.trim();
  const isMatch = typedName.trim() === trimmedExpected;

  useEffect(() => {
    if (open) {
      setTypedName("");
    }
  }, [open, itemName]);

  const handleConfirm = async () => {
    if (!isMatch || isPending) return;
    await onConfirm();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title ?? t("deleteTitle")}</DialogTitle>
          <DialogDescription>
            {description ?? t("deleteTypeNameDescription", { name: trimmedExpected })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            <p className="text-sm font-semibold text-destructive">{trimmedExpected}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delete-confirm-name">{t("deleteTypeNameLabel")}</Label>
            <Input
              id="delete-confirm-name"
              value={typedName}
              disabled={isPending}
              autoComplete="off"
              placeholder={trimmedExpected}
              onChange={(event) => setTypedName(event.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!isMatch || isPending}
              onClick={handleConfirm}
            >
              {isPending ? t("loading") : t("delete")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
