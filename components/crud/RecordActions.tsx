"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { DeleteConfirmDialog } from "@/components/crud/DeleteConfirmDialog";

type RecordActionsProps = {
  onEdit?: () => void;
  onDelete?: () => Promise<{ success: boolean; error?: string }>;
  deleteItemName: string;
  deleteTitle?: string;
  deleteDescription?: string;
  deleteSuccessMessage?: string;
  deleteErrorMessage?: string;
  disabled?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
};

export function RecordActions({
  onEdit,
  onDelete,
  deleteItemName,
  deleteTitle,
  deleteDescription,
  deleteSuccessMessage,
  deleteErrorMessage,
  disabled = false,
  showEdit = true,
  showDelete = true,
}: RecordActionsProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      const result = await onDelete();
      if (result.success) {
        toast.success(deleteSuccessMessage ?? t("deleteSuccess"));
        setDeleteOpen(false);
        router.refresh();
        return;
      }
      toast.error(result.error ?? deleteErrorMessage ?? t("deleteFailed"));
    } catch {
      toast.error(deleteErrorMessage ?? t("deleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex justify-end gap-1">
        {showEdit && onEdit && (
          <Button type="button" size="icon" variant="ghost" disabled={disabled} onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {showDelete && onDelete && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>

      {showDelete && onDelete && (
        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          itemName={deleteItemName}
          title={deleteTitle}
          description={deleteDescription}
          onConfirm={handleConfirmDelete}
          isPending={isDeleting}
        />
      )}
    </>
  );
}
