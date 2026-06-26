"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Role } from "@prisma/client";
import {
  Bell,
  Building2,
  CheckCircle,
  Plus,
  Scale,
  ScrollText,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateLawsuitDialog, type LawyerOption, type LookupOption } from "@/components/litigation/CreateLawsuitDialog";
import { CreateGafiTaskDialog } from "@/components/gafi/CreateGafiTaskDialog";
import { CreatePowerOfAttorneyDialog } from "@/components/poa/CreatePowerOfAttorneyDialog";
import { CreateLegalTaskDialog } from "@/components/legal-tasks/CreateLegalTaskDialog";
import {
  CreateExecutionRequestDialog,
  type LawsuitOption,
} from "@/components/executions/CreateExecutionRequestDialog";
import { isManagerOrAbove } from "@/lib/rbac";

type QuickAddDialog =
  | "lawsuit"
  | "gafi"
  | "poa"
  | "legalTask"
  | "execution"
  | null;

export function QuickAddMenu({
  userRole,
  lawyers,
  lawsuits,
  courtLookups,
  expertOfficeLookups,
}: {
  userRole: Role;
  lawyers: LawyerOption[];
  lawsuits: LawsuitOption[];
  courtLookups: LookupOption[];
  expertOfficeLookups: LookupOption[];
}) {
  const t = useTranslations("quickAdd");
  const canCreate = isManagerOrAbove(userRole);
  const [activeDialog, setActiveDialog] = useState<QuickAddDialog>(null);

  if (!canCreate) return null;

  const close = () => setActiveDialog(null);

  return (
    <>
      <Button variant="ghost" size="icon" className="relative h-9 w-9 text-slate-600" aria-label={t("notifications")}>
        <Bell className="h-5 w-5" />
        <span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="rounded-full bg-blue-900 hover:bg-blue-800">
            <Plus className="me-2 h-4 w-4" />
            {t("add")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setActiveDialog("lawsuit")}>
            <Scale className="me-2 h-4 w-4 text-slate-600" />
            {t("newLawsuit")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveDialog("gafi")}>
            <Building2 className="me-2 h-4 w-4 text-slate-600" />
            {t("newGafiTask")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveDialog("poa")}>
            <ScrollText className="me-2 h-4 w-4 text-slate-600" />
            {t("newPoa")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveDialog("legalTask")}>
            <CheckCircle className="me-2 h-4 w-4 text-slate-600" />
            {t("assignTask")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveDialog("execution")}>
            <Shield className="me-2 h-4 w-4 text-slate-600" />
            {t("newExecution")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateLawsuitDialog
        lawyers={lawyers}
        courtLookups={courtLookups}
        expertOfficeLookups={expertOfficeLookups}
        canCreate={canCreate}
        open={activeDialog === "lawsuit"}
        onOpenChange={(open) => !open && close()}
        hideTrigger
      />
      <CreateGafiTaskDialog
        canCreate={canCreate}
        open={activeDialog === "gafi"}
        onOpenChange={(open) => !open && close()}
        hideTrigger
      />
      <CreatePowerOfAttorneyDialog
        lawyers={lawyers}
        canCreate={canCreate}
        open={activeDialog === "poa"}
        onOpenChange={(open) => !open && close()}
        hideTrigger
      />
      <CreateLegalTaskDialog
        lawyers={lawyers}
        canCreate={canCreate}
        open={activeDialog === "legalTask"}
        onOpenChange={(open) => !open && close()}
        hideTrigger
      />
      <CreateExecutionRequestDialog
        lawyers={lawyers}
        lawsuits={lawsuits}
        canCreate={canCreate}
        open={activeDialog === "execution"}
        onOpenChange={(open) => !open && close()}
        hideTrigger
      />
    </>
  );
}
