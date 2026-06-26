"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Scale } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { updateLawsuitDetails } from "@/app/actions/updateLawsuitDetails";
import { useRouter } from "@/i18n/navigation";
import {
  LawsuitExpertsFinancialsSection,
  type ExpertsFinancialsValues,
} from "./LawsuitExpertsFinancialsSection";

export type LawsuitEditData = {
  id: string;
  caseLabel: string;
  isAtExperts: boolean;
  expertOffice: string | null;
  expertName: string | null;
  expertFileNumber: string | null;
  awardedCompensation: number;
  judicialFees: number;
};

export function EditLawsuitDialog({
  lawsuit,
  canEdit,
  locale,
  expertOfficeLookups = [],
}: {
  lawsuit: LawsuitEditData;
  canEdit: boolean;
  locale: string;
  expertOfficeLookups?: { id: string; name: string }[];
}) {
  const t = useTranslations("litigation");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<ExpertsFinancialsValues>({
    isAtExperts: lawsuit.isAtExperts,
    expertOffice: lawsuit.expertOffice ?? "",
    expertName: lawsuit.expertName ?? "",
    expertFileNumber: lawsuit.expertFileNumber ?? "",
    awardedCompensation: String(lawsuit.awardedCompensation ?? 0),
    judicialFees: String(lawsuit.judicialFees ?? 0),
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ExpertsFinancialsValues, string>>
  >({});

  const handleOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      setValues({
        isAtExperts: lawsuit.isAtExperts,
        expertOffice: lawsuit.expertOffice ?? "",
        expertName: lawsuit.expertName ?? "",
        expertFileNumber: lawsuit.expertFileNumber ?? "",
        awardedCompensation: String(lawsuit.awardedCompensation ?? 0),
        judicialFees: String(lawsuit.judicialFees ?? 0),
      });
      setFieldErrors({});
      setError(null);
    }
    setOpen(nextOpen);
  };

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof ExpertsFinancialsValues, string>> = {};
    if (values.isAtExperts) {
      if (!values.expertOffice.trim()) nextErrors.expertOffice = tCommon("requiredField");
      if (!values.expertName.trim()) nextErrors.expertName = tCommon("requiredField");
      if (!values.expertFileNumber.trim()) {
        nextErrors.expertFileNumber = tCommon("requiredField");
      }
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("lawsuitId", lawsuit.id);
    formData.set("isAtExperts", String(values.isAtExperts));
    formData.set("expertOffice", values.expertOffice);
    formData.set("expertName", values.expertName);
    formData.set("expertFileNumber", values.expertFileNumber);
    formData.set("awardedCompensation", values.awardedCompensation);
    formData.set("judicialFees", values.judicialFees);

    const result = await updateLawsuitDetails(formData);
    setSubmitting(false);

    if (result.success) {
      setOpen(false);
      router.refresh();
      return;
    }

    setError(result.error ?? t("updateError"));
  };

  if (!canEdit) return null;

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => handleOpen(true)}>
        <Pencil className="h-4 w-4" />
        {t("editLawsuit")}
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Scale className="h-5 w-5" />
              </div>
              <div className="text-start">
                <DialogTitle className="text-slate-900">{t("editLawsuitTitle")}</DialogTitle>
                <DialogDescription>{lawsuit.caseLabel}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <LawsuitExpertsFinancialsSection
              locale={locale}
              values={values}
              expertOfficeLookups={expertOfficeLookups}
              onChange={(key, value) => {
                setValues((current) => ({ ...current, [key]: value }));
                setFieldErrors((current) => ({ ...current, [key]: undefined }));
              }}
              errors={fieldErrors}
            />

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {tCommon("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {submitting ? tCommon("loading") : t("saveLawsuitDetails")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function LawsuitFinancialSummary({
  awardedCompensation,
  judicialFees,
  locale,
}: {
  awardedCompensation: number;
  judicialFees: number;
  locale: string;
}) {
  const t = useTranslations("litigation");
  const tDash = useTranslations("dashboard");

  const formatAmount = (amount: number) =>
    `${new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)} ${tDash("egp")}`;

  if (!awardedCompensation && !judicialFees) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-4 text-sm">
      {awardedCompensation > 0 && (
        <p className="font-semibold text-emerald-700">
          {t("awardedCompensation")}: {formatAmount(awardedCompensation)}
        </p>
      )}
      {judicialFees > 0 && (
        <p className="font-semibold text-slate-700">
          {t("judicialFees")}: {formatAmount(judicialFees)}
        </p>
      )}
    </div>
  );
}
