"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, FileWarning, Plus } from "lucide-react";
import { LegalNoticeDeliveryStatus } from "@prisma/client";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { createLegalNotice } from "@/app/actions/createLegalNotice";
import { updateLegalNotice } from "@/app/actions/legalNoticeCrud";
import { LEGAL_NOTICE_TYPES } from "@/lib/notices/constants";
import { useFormResetOnOpen } from "@/lib/hooks/useFormResetOnOpen";
import { useRouter } from "@/i18n/navigation";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { cn } from "@/lib/utils";

const schema = z.object({
  noticeNumber: z.string().optional(),
  year: z.string().min(4).max(4),
  bailiffOffice: z.string().min(1),
  clientName: z.string().min(1),
  opponentName: z.string().min(1),
  noticeType: z.string().min(1),
  submissionDate: z.date(),
  followUpDate: z.date().optional(),
  deliveryStatus: z.nativeEnum(LegalNoticeDeliveryStatus).optional(),
  deliveryDate: z.date().optional(),
  assignedLawyerId: z.string().min(1),
  contractId: z.string().optional(),
  lawsuitId: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export type LegalNoticeFormInitialData = FormData & { id: string };

export type LawyerOption = { id: string; name: string };

export type ContractOption = {
  id: string;
  label: string;
};

export type LawsuitOption = {
  id: string;
  label: string;
};

function DateField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value?: Date;
  onChange: (date?: Date) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn("w-full justify-start font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon className="me-2 h-4 w-4" />
            {value ? format(value, "yyyy-MM-dd") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={onChange} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function CreateLegalNoticeDialog({
  lawyers,
  contracts = [],
  lawsuits = [],
  canCreate,
  initialData = null,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  lawyers: LawyerOption[];
  contracts?: ContractOption[];
  lawsuits?: LawsuitOption[];
  canCreate: boolean;
  initialData?: LegalNoticeFormInitialData | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const t = useTranslations("notices");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = Boolean(initialData?.id);

  const defaultValues = useMemo(
    () => ({
      year: String(new Date().getFullYear()),
      clientName: "NJD",
      deliveryStatus: LegalNoticeDeliveryStatus.PENDING,
    }),
    []
  );

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = form;

  useFormResetOnOpen(form, open, initialData, defaultValues);

  const buildFormData = (data: FormData) => {
    const formData = new FormData();
    if (data.noticeNumber) formData.set("noticeNumber", data.noticeNumber);
    formData.set("year", data.year);
    formData.set("bailiffOffice", data.bailiffOffice);
    formData.set("clientName", data.clientName);
    formData.set("opponentName", data.opponentName);
    formData.set("noticeType", data.noticeType);
    formData.set("submissionDate", data.submissionDate.toISOString());
    if (data.followUpDate) formData.set("followUpDate", data.followUpDate.toISOString());
    if (isEditMode && data.deliveryStatus) {
      formData.set("deliveryStatus", data.deliveryStatus);
    }
    if (isEditMode && data.deliveryDate) {
      formData.set("deliveryDate", data.deliveryDate.toISOString());
    }
    formData.set("assignedLawyerId", data.assignedLawyerId);
    if (data.contractId) formData.set("contractId", data.contractId);
    if (data.lawsuitId) formData.set("lawsuitId", data.lawsuitId);
    if (data.notes) formData.set("notes", data.notes);
    return formData;
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError(null);

    const formData = buildFormData(data);
    const result = isEditMode
      ? await updateLegalNotice(initialData!.id, formData)
      : await createLegalNotice(formData);

    setSubmitting(false);

    if (result.success) {
      toast.success(tCommon("saveSuccess"));
      setOpen(false);
      router.refresh();
      return;
    }

    setError(result.error ?? t("createError"));
    toast.error(result.error ?? t("createError"));
  };

  if (!canCreate && !isEditMode) return null;

  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white">
              <FileWarning className="h-5 w-5" />
            </div>
            <div className="text-start">
              <DialogTitle className="text-foreground">
                {isEditMode ? t("editTitle") : t("createTitle")}
              </DialogTitle>
              <DialogDescription>
                {isEditMode ? t("editDescription") : t("createDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="noticeNumber">{t("noticeNumber")}</Label>
              <Input id="noticeNumber" {...register("noticeNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">{t("year")}</Label>
              <Input id="year" maxLength={4} {...register("year")} />
              {errors.year && (
                <p className="text-sm text-destructive">{errors.year.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bailiffOffice">{t("bailiffOffice")}</Label>
            <Input id="bailiffOffice" placeholder={t("bailiffOfficePlaceholder")} {...register("bailiffOffice")} />
            {errors.bailiffOffice && (
              <p className="text-sm text-destructive">{errors.bailiffOffice.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientName">{t("clientName")}</Label>
              <Input id="clientName" {...register("clientName")} />
              {errors.clientName && (
                <p className="text-sm text-destructive">{errors.clientName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="opponentName">{t("opponentName")}</Label>
              <Input id="opponentName" {...register("opponentName")} />
              {errors.opponentName && (
                <p className="text-sm text-destructive">{errors.opponentName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("noticeType")}</Label>
            <Controller
              name="noticeType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectNoticeType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {LEGAL_NOTICE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.noticeType && (
              <p className="text-sm text-destructive">{errors.noticeType.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="submissionDate"
              control={control}
              render={({ field }) => (
                <DateField
                  label={t("submissionDate")}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t("submissionDate")}
                />
              )}
            />
            <Controller
              name="followUpDate"
              control={control}
              render={({ field }) => (
                <DateField
                  label={t("followUpDate")}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t("followUpDate")}
                />
              )}
            />
          </div>

          {isEditMode && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("deliveryStatus")}</Label>
                <Controller
                  name="deliveryStatus"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("deliveryStatus")} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(LegalNoticeDeliveryStatus).map((status) => (
                          <SelectItem key={status} value={status}>
                            {t(`deliveryStatus_${status}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <Controller
                name="deliveryDate"
                control={control}
                render={({ field }) => (
                  <DateField
                    label={t("deliveryDate")}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t("deliveryDate")}
                  />
                )}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("assignedLawyer")}</Label>
            <Controller
              name="assignedLawyerId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectLawyer")} />
                  </SelectTrigger>
                  <SelectContent>
                    {lawyers.map((lawyer) => (
                      <SelectItem key={lawyer.id} value={lawyer.id}>
                        {lawyer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.assignedLawyerId && (
              <p className="text-sm text-destructive">{errors.assignedLawyerId.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("linkedContract")}</Label>
              <Controller
                name="contractId"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(value) => field.onChange(value === "__none__" ? undefined : value)}
                    value={field.value ?? "__none__"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectContract")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("noLink")}</SelectItem>
                      {contracts.map((contract) => (
                        <SelectItem key={contract.id} value={contract.id}>
                          {contract.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("linkedLawsuit")}</Label>
              <Controller
                name="lawsuitId"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(value) => field.onChange(value === "__none__" ? undefined : value)}
                    value={field.value ?? "__none__"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectLawsuit")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("noLink")}</SelectItem>
                      {lawsuits.map((lawsuit) => (
                        <SelectItem key={lawsuit.id} value={lawsuit.id}>
                          {lawsuit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? tCommon("loading") : isEditMode ? tCommon("save") : t("createSubmit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (hideTrigger || isEditMode) return dialog;

  return (
    <PermissionGuard permission="NOTICES_CREATE">
      <>
        <Button className="gap-2 bg-amber-600 hover:bg-amber-700" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("addNotice")}
        </Button>
        {dialog}
      </>
    </PermissionGuard>
  );
}
