import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LibraryView } from "@/components/library/LibraryView";
import { UploadLegalDocumentDialog } from "@/components/library/UploadLegalDocumentDialog";
import { canUploadLibraryDocuments } from "@/lib/rbac";

export default async function LibraryPage() {
  const t = await getTranslations("library");
  const session = await auth();

  const documents = await prisma.legalDocument.findMany({
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { uploadedAt: "desc" },
  });

  const data = documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    category: doc.category,
    fileUrl: doc.fileUrl,
    uploadedAt: doc.uploadedAt.toISOString(),
    uploadedByName: doc.uploadedBy.name,
  }));

  const canUpload = session?.user ? canUploadLibraryDocuments(session.user.role) : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        icon={BookOpen}
        action={<UploadLegalDocumentDialog canUpload={canUpload} />}
      />
      <LibraryView documents={data} />
    </div>
  );
}
