"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ManagerRoleGuard } from "@/components/auth/ManagerRoleGuard";

function formatEgp(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export type ExpertsFinancialsValues = {
  isAtExperts: boolean;
  expertOffice: string;
  expertName: string;
  expertFileNumber: string;
  awardedCompensation: string;
  judicialFees: string;
};

type LookupOption = { id: string; name: string };

type FieldProps = {
  values: ExpertsFinancialsValues;
  expertOfficeLookups?: LookupOption[];
  onChange: <K extends keyof ExpertsFinancialsValues>(
    key: K,
    value: ExpertsFinancialsValues[K]
  ) => void;
  locale: string;
  errors?: Partial<Record<keyof ExpertsFinancialsValues, string>>;
};

export function LawsuitExpertsFinancialsSection({
  values,
  expertOfficeLookups = [],
  onChange,
  locale,
  errors,
}: FieldProps) {
  const t = useTranslations("litigation");
  const tDash = useTranslations("dashboard");

  return (
    <div className="space-y-4 rounded-lg border border-purple-100 bg-purple-50/30 p-4">
      <h3 className="text-sm font-semibold text-slate-800">
        {t("financialsExpertsSection")}
      </h3>

      <ManagerRoleGuard>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="awardedCompensation">{t("awardedCompensation")}</Label>
            <Input
              id="awardedCompensation"
              type="number"
              min={0}
              step="0.01"
              value={values.awardedCompensation}
              onChange={(event) => onChange("awardedCompensation", event.target.value)}
            />
            <p className="text-xs text-slate-500">
              {formatEgp(Number(values.awardedCompensation) || 0, locale)} {tDash("egp")}
            </p>
            {errors?.awardedCompensation && (
              <p className="text-sm text-destructive">{errors.awardedCompensation}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="judicialFees">{t("judicialFees")}</Label>
            <Input
              id="judicialFees"
              type="number"
              min={0}
              step="0.01"
              value={values.judicialFees}
              onChange={(event) => onChange("judicialFees", event.target.value)}
            />
            <p className="text-xs text-slate-500">
              {formatEgp(Number(values.judicialFees) || 0, locale)} {tDash("egp")}
            </p>
            {errors?.judicialFees && (
              <p className="text-sm text-destructive">{errors.judicialFees}</p>
            )}
          </div>
        </div>
      </ManagerRoleGuard>

      <div className="flex items-center justify-between gap-4 border-t border-purple-100 pt-4">
        <Label htmlFor="isAtExperts" className="cursor-pointer font-medium text-slate-800">
          {t("referToExperts")}
        </Label>
        <Switch
          id="isAtExperts"
          checked={values.isAtExperts}
          onCheckedChange={(checked) => onChange("isAtExperts", checked)}
        />
      </div>

      <div
        className={cn(
          "grid gap-4 overflow-hidden transition-all duration-300",
          values.isAtExperts
            ? "max-h-96 opacity-100"
            : "max-h-0 opacity-0 pointer-events-none"
        )}
      >
        <div className="space-y-2 pt-1">
          <Label htmlFor="expertOffice">{t("expertOffice")}</Label>
          {expertOfficeLookups.length > 0 ? (
            <Select
              value={values.expertOffice}
              onValueChange={(value) => onChange("expertOffice", value)}
            >
              <SelectTrigger id="expertOffice">
                <SelectValue placeholder={t("expertOfficePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {expertOfficeLookups.map((office) => (
                  <SelectItem key={office.id} value={office.name}>
                    {office.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="expertOffice"
              value={values.expertOffice}
              onChange={(event) => onChange("expertOffice", event.target.value)}
              placeholder={t("expertOfficePlaceholder")}
            />
          )}
          {errors?.expertOffice && (
            <p className="text-sm text-destructive">{errors.expertOffice}</p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="expertName">{t("expertName")}</Label>
            <Input
              id="expertName"
              value={values.expertName}
              onChange={(event) => onChange("expertName", event.target.value)}
              placeholder={t("expertNamePlaceholder")}
            />
            {errors?.expertName && (
              <p className="text-sm text-destructive">{errors.expertName}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="expertFileNumber">{t("expertFileNumber")}</Label>
            <Input
              id="expertFileNumber"
              value={values.expertFileNumber}
              onChange={(event) => onChange("expertFileNumber", event.target.value)}
              placeholder={t("expertFileNumberPlaceholder")}
            />
            {errors?.expertFileNumber && (
              <p className="text-sm text-destructive">{errors.expertFileNumber}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
