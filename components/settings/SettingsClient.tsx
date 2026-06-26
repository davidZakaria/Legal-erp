"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createLookup,
  deleteLookup,
  updateLookup,
  type LookupType,
} from "@/app/actions/lookup-actions";
import { LookupFormModal, type LookupFormData } from "@/components/settings/LookupFormModal";
import { DeleteConfirmDialog } from "@/components/crud/DeleteConfirmDialog";
import { useRouter } from "@/i18n/navigation";

type LookupRow = { id: string; name: string; location?: string };

type TabKey = "courts" | "police" | "experts" | "contracts";

const TAB_TO_LOOKUP_TYPE: Record<TabKey, LookupType> = {
  courts: "court",
  police: "policeStation",
  experts: "expertOffice",
  contracts: "project",
};

export function SettingsClient({
  courts,
  policeStations,
  expertOffices,
  projects,
}: {
  courts: LookupRow[];
  policeStations: LookupRow[];
  expertOffices: LookupRow[];
  projects: LookupRow[];
}) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("courts");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LookupFormData | null>(null);
  const [search, setSearch] = useState("");

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<LookupRow | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [projectError, setProjectError] = useState<string | null>(null);
  const [isProjectPending, startProjectTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const activeLookupType = TAB_TO_LOOKUP_TYPE[activeTab];
  const isProjectTab = activeTab === "contracts";

  const rowsByTab: Record<TabKey, LookupRow[]> = {
    courts,
    police: policeStations,
    experts: expertOffices,
    contracts: projects,
  };

  const activeRows = rowsByTab[activeTab];

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return activeRows;
    return activeRows.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        (row.location?.toLowerCase().includes(query) ?? false)
    );
  }, [activeRows, search]);

  const openCreateModal = () => {
    if (isProjectTab) {
      setEditingProject(null);
      setProjectName("");
      setProjectLocation("");
      setProjectError(null);
      setProjectModalOpen(true);
      return;
    }
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (row: LookupRow) => {
    if (isProjectTab) {
      setEditingProject(row);
      setProjectName(row.name);
      setProjectLocation(row.location ?? "");
      setProjectError(null);
      setProjectModalOpen(true);
      return;
    }
    setEditingItem({ id: row.id, name: row.name });
    setIsModalOpen(true);
  };

  const closeLookupModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleLookupSubmit = useCallback(
    async (values: { name: string }) => {
      const result = editingItem
        ? await updateLookup(activeLookupType, editingItem.id, values.name)
        : await createLookup(activeLookupType, values.name);

      if (result.success) {
        toast.success(t("saveSuccess"));
        setIsModalOpen(false);
        setEditingItem(null);
        router.refresh();
        return { success: true as const };
      }

      toast.error(result.error ?? t("saveError"));
      return { success: false as const, error: result.error };
    },
    [activeLookupType, editingItem, router, t]
  );

  const handleProjectSubmit = () => {
    startProjectTransition(async () => {
      setProjectError(null);
      const trimmedName = projectName.trim();
      const trimmedLocation = projectLocation.trim();

      if (trimmedName.length < 2) {
        setProjectError(t("lookupNameMinLength"));
        return;
      }
      if (!trimmedLocation) {
        setProjectError(t("projectLocationRequired"));
        return;
      }

      const result = editingProject
        ? await updateLookup("project", editingProject.id, trimmedName, {
            location: trimmedLocation,
          })
        : await createLookup("project", trimmedName, { location: trimmedLocation });

      if (result.success) {
        toast.success(t("saveSuccess"));
        setProjectModalOpen(false);
        setEditingProject(null);
        router.refresh();
        return;
      }

      toast.error(result.error ?? t("saveError"));
      setProjectError(result.error ?? t("saveError"));
    });
  };

  const handleDeleteRequest = (row: LookupRow) => {
    setDeleteTarget({ id: row.id, name: row.name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget.id);
    try {
      const result = await deleteLookup(activeLookupType, deleteTarget.id);
      if (result.success) {
        toast.success(t("deleteLookupSuccess"));
        setDeleteTarget(null);
        router.refresh();
        return;
      }
      toast.error(result.error ?? t("deleteLookupError"));
    } catch {
      toast.error(t("deleteLookupError"));
    } finally {
      setDeletingId(null);
    }
  };

  const modalTitle = editingItem ? t("editLookup") : t("addLookup");
  const projectModalTitle = editingProject ? t("editLookup") : t("addLookup");
  const modalKey = editingItem ? `edit-${editingItem.id}` : "create";

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          {(
            [
              ["courts", t("tabCourts")],
              ["police", t("tabPoliceStations")],
              ["experts", t("tabExpertOffices")],
              ["contracts", t("tabContracts")],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              type="button"
              variant={activeTab === key ? "default" : "outline"}
              className={activeTab === key ? "bg-slate-900 hover:bg-slate-800" : ""}
              onClick={() => {
                setActiveTab(key);
                setSearch("");
              }}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder={t("quickSearch")}
              className="max-w-sm"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button
              type="button"
              className="gap-2 bg-slate-900 hover:bg-slate-800 sm:shrink-0"
              onClick={openCreateModal}
            >
              <Plus className="h-4 w-4" />
              {t("addLookup")}
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead>{t("lookupName")}</TableHead>
                  {isProjectTab && <TableHead>{t("projectLocation")}</TableHead>}
                  <TableHead className="w-28 text-end">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isProjectTab ? 3 : 2}
                      className="py-8 text-center text-slate-500"
                    >
                      {search.trim() ? t("noSearchResults") : t("noLookups")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      {isProjectTab && (
                        <TableCell className="text-slate-600">{row.location}</TableCell>
                      )}
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditModal(row)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={deletingId === row.id}
                            onClick={() => handleDeleteRequest(row)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <LookupFormModal
        key={modalKey}
        isOpen={isModalOpen}
        onClose={closeLookupModal}
        initialData={editingItem}
        title={modalTitle}
        onSubmit={handleLookupSubmit}
      />

      <Dialog
        open={projectModalOpen}
        onOpenChange={(open) => {
          if (!open && !isProjectPending) {
            setProjectModalOpen(false);
            setEditingProject(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{projectModalTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">{t("lookupName")}</Label>
              <Input
                id="project-name"
                value={projectName}
                disabled={isProjectPending}
                onChange={(event) => setProjectName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-location">{t("projectLocation")}</Label>
              <Input
                id="project-location"
                value={projectLocation}
                disabled={isProjectPending}
                onChange={(event) => setProjectLocation(event.target.value)}
              />
            </div>
            {projectError && (
              <p className="text-sm text-destructive">{projectError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isProjectPending}
                onClick={() => {
                  setProjectModalOpen(false);
                  setEditingProject(null);
                }}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="button"
                disabled={
                  isProjectPending ||
                  projectName.trim().length < 2 ||
                  !projectLocation.trim()
                }
                onClick={handleProjectSubmit}
              >
                {isProjectPending ? tCommon("loading") : tCommon("save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        itemName={deleteTarget?.name ?? ""}
        title={t("deleteLookupConfirm")}
        isPending={deletingId !== null}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
