"use client";

import { useState } from "react";
import { LibraryView, type LibraryDocument } from "@/components/library/LibraryView";
import {
  UploadLegalDocumentDialog,
  type LegalDocumentFormInitialData,
} from "@/components/library/UploadLegalDocumentDialog";

export function LibraryModule({
  documents,
  canCreate,
  canUpdate,
  canDelete,
}: {
  documents: LibraryDocument[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [editingDoc, setEditingDoc] = useState<LegalDocumentFormInitialData | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const handleEdit = (doc: LibraryDocument) => {
    setEditingDoc({
      id: doc.id,
      title: doc.title,
      category: doc.category,
    });
    setEditOpen(true);
  };

  return (
    <>
      <LibraryView
        documents={documents}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onEdit={handleEdit}
      />

      {canUpdate && editingDoc && (
        <UploadLegalDocumentDialog
          canCreate={canCreate}
          canUpdate={canUpdate}
          initialData={editingDoc}
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setEditingDoc(null);
          }}
          hideTrigger
        />
      )}
    </>
  );
}
