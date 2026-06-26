import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type BadgeTone = "success" | "warning" | "info" | "muted" | "destructive" | "default";

type LabelConfig = {
  ar: string;
  en: string;
  tone: BadgeTone;
};

const CONTRACT_STATUS: Record<string, LabelConfig> = {
  ACTIVE: { ar: "ساري", en: "Active", tone: "success" },
};

const GAFI_STATUS: Record<string, LabelConfig> = {
  PENDING: { ar: "قيد المراجعة", en: "Under Review", tone: "warning" },
  IN_PROGRESS: { ar: "جاري اتخاذ الإجراءات", en: "In Progress", tone: "info" },
  COMPLETED: { ar: "منتهية", en: "Completed", tone: "success" },
};

const GAFI_TASK_TYPE: Record<string, LabelConfig> = {
  ASSEMBLY: { ar: "جمعية عمومية", en: "General Assembly", tone: "default" },
  TRADEMARK: { ar: "علامة تجارية", en: "Trademark", tone: "default" },
};

const COURT_SESSION_STATUS: Record<string, LabelConfig> = {
  PENDING: { ar: "متداولة", en: "In Session", tone: "warning" },
  COMPLETED: { ar: "محجوزة للحكم / منتهية", en: "Reserved / Concluded", tone: "muted" },
};

const LAWSUIT_STATUS: Record<string, LabelConfig> = {
  UNDER_REVIEW: { ar: "تحت الفحص والدراسة", en: "Under Review", tone: "muted" },
  ACTIVE: { ar: "متداولة", en: "Active", tone: "info" },
  RESERVED: { ar: "محجوزة للحكم", en: "Reserved for Judgment", tone: "warning" },
  COMPLETED: { ar: "منتهية", en: "Completed", tone: "success" },
};

const PROSECUTION_STATUS: Record<string, LabelConfig> = {
  POLICE_REPORT: { ar: "قيد التحقيق بالقسم", en: "Under Police Investigation", tone: "muted" },
  IN_COURT: { ar: "متداولة بالمحكمة", en: "In Court", tone: "info" },
  RECONCILED: { ar: "تم التصالح / حفظ", en: "Reconciled / Dismissed", tone: "success" },
  ARCHIVED_SAVED: { ar: "مُحفظ", en: "Archived", tone: "muted" },
};

const ASSEMBLY_TYPE: Record<string, LabelConfig> = {
  ORDINARY: { ar: "جمعية عادية", en: "Ordinary Assembly", tone: "default" },
  EXTRAORDINARY: { ar: "جمعية غير عادية", en: "Extraordinary Assembly", tone: "warning" },
};

const toneClasses: Record<BadgeTone, string> = {
  success: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  warning: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  info: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  muted: "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  destructive: "border-transparent bg-destructive text-destructive-foreground",
  default: "border-transparent bg-secondary text-secondary-foreground",
};

export function getLegalLabel(
  category:
    | "contractStatus"
    | "gafiStatus"
    | "gafiTaskType"
    | "courtSessionStatus"
    | "lawsuitStatus"
    | "prosecutionStatus"
    | "assemblyType",
  value: string,
  locale: string
): { label: string; tone: BadgeTone } {
  const maps = {
    contractStatus: CONTRACT_STATUS,
    gafiStatus: GAFI_STATUS,
    gafiTaskType: GAFI_TASK_TYPE,
    courtSessionStatus: COURT_SESSION_STATUS,
    lawsuitStatus: LAWSUIT_STATUS,
    prosecutionStatus: PROSECUTION_STATUS,
    assemblyType: ASSEMBLY_TYPE,
  };

  const config = maps[category][value];
  if (!config) {
    return { label: value, tone: "default" };
  }

  return {
    label: locale === "ar" ? config.ar : config.en,
    tone: config.tone,
  };
}

export function LegalBadge({
  category,
  value,
  locale,
  pulse = false,
  className,
}: {
  category:
    | "contractStatus"
    | "gafiStatus"
    | "gafiTaskType"
    | "courtSessionStatus"
    | "lawsuitStatus"
    | "prosecutionStatus"
    | "assemblyType";
  value: string;
  locale: string;
  pulse?: boolean;
  className?: string;
}) {
  const { label, tone } = getLegalLabel(category, value, locale);

  return (
    <Badge
      className={cn(
        toneClasses[tone],
        pulse && "animate-pulse",
        className
      )}
    >
      {label}
    </Badge>
  );
}

export function ExpertsBadge({ locale, className }: { locale: string; className?: string }) {
  return (
    <Badge
      className={cn(
        "border-transparent bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
        className
      )}
    >
      {locale === "ar" ? "متداولة بالخبراء" : "At Experts"}
    </Badge>
  );
}
