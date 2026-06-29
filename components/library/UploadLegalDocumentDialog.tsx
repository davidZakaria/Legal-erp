"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadLegalDocument } from "@/app/actions/uploadLegalDocument";
import { updateLegalDocument } from "@/app/actions/libraryCrud";
import { useFormResetOnOpen } from "@/lib/hooks/useFormResetOnOpen";
import { useRouter } from "@/i18n/navigation";
import { LegalDocumentCategory } from "@prisma/client";
import { toast } from "sonner";

const schema = z.object({
  title: z.string().min(1),
  category: z.nativeEnum(LegalDocumentCategory),
});

type FormData = z.infer<typeof schema>;

export type LegalDocumentFormInitialData = {
  id: string;
  title: string;
  category: LegalDocumentCategory;
};

export function UploadLegalDocumentDialog({
  canCreate,
  canUpdate = false,
  defaultCategory,
  initialData = null,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  canCreate: boolean;
  canUpdate?: boolean;
  defaultCategory?: LegalDocumentCategory;
  initialData?: LegalDocumentFormInitialData | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const t = useTranslations("library");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const isEditMode = Boolean(initialData?.id);

  const defaultValues = useMemo(
    () => ({
      title: "",
      category: defaultCategory ?? LegalDocumentCategory.CONTRACT_TEMPLATE,
    }),
    [defaultCategory]
  );

  const formInitial = useMemo(() => {
    if (!initialData) return null;
    return {
      title: initialData.title,
      category: initialData.category,
    };
  }, [initialData]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { register, handleSubmit, control, formState: { errors } } = form;

  useFormResetOnOpen(form, open, formInitial, defaultValues);

  const onSubmit = async (data: FormData) => {
    if (!isEditMode && !file) {
      setError(t("fileRequired"));
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("title", data.title);
    formData.set("category", data.category);
    if (file) formData.set("file", file);

    const result = isEditMode
      ? await updateLegalDocument(initialData!.id, formData)
      : await uploadLegalDocument(formData);

    setSubmitting(false);

    if (result.success) {
      toast.success(tCommon("saveSuccess"));
      setFile(null);
      setOpen(false);
      router.refresh();
      return;
    }
    setError(result.error ?? t("uploadError"));
    toast.error(result.error ?? t("uploadError"));
  };

  if (!isEditMode && !canCreate) return null;
  if (isEditMode && !canUpdate) return null;

  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Upload className="h-5 w-5" />
            </div>
            <div className="text-start">
              <DialogTitle>
                {isEditMode ? t("editTitle") : t("uploadTitle")}
              </DialogTitle>
              <DialogDescription>
                {isEditMode ? t("editDescription") : t("uploadDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="docTitle">{t("documentTitle")}</Label>
            <Input id="docTitle" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t("category")}</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(LegalDocumentCategory).map((cat) => (
                      <SelectItem key={cat} value={cat}>{t(`category_${cat}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="docFile">
              {isEditMode ? t("fileOptional") : t("file")}
            </Label>
            <Input
              id="docFile"
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? tCommon("loading")
                : isEditMode
                  ? tCommon("save")
                  : t("uploadSubmit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (hideTrigger || isEditMode) return dialog;

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {t("uploadDocument")}
      </Button>
      {dialog}
    </>
  );
}
