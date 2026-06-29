import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LibraryModule } from "@/components/library/LibraryModule";
import { UploadLegalDocumentDialog } from "@/components/library/UploadLegalDocumentDialog";

export default async function LibraryPage() {
  const t = await getTranslations("library");
  const locale = await getLocale();
  const session = await auth();

  if (
    session?.user &&
    !(await hasPermission(session.user.id, "LIBRARY_READ", session.user.role))
  ) {
    redirect({ href: "/", locale });
  }

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

  const user = session!.user;
  const canCreate = await hasPermission(user.id, "LIBRARY_CREATE", user.role);
  const canUpdate = await hasPermission(user.id, "LIBRARY_UPDATE", user.role);
  const canDelete = await hasPermission(user.id, "LIBRARY_DELETE", user.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        icon={BookOpen}
        action={
          canCreate ? (
            <UploadLegalDocumentDialog canCreate={canCreate} canUpdate={canUpdate} />
          ) : undefined
        }
      />
      <LibraryModule
        documents={data}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
