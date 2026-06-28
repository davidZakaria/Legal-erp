"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { FileText, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LegalDocumentCategory } from "@prisma/client";

export type LibraryDocument = {
  id: string;
  title: string;
  category: LegalDocumentCategory;
  fileUrl: string;
  uploadedAt: string;
  uploadedByName: string;
};

const TAB_CATEGORIES: LegalDocumentCategory[] = [
  LegalDocumentCategory.CONTRACT_TEMPLATE,
  LegalDocumentCategory.INTERNAL_MEMO,
  LegalDocumentCategory.GAFI_FORM,
  LegalDocumentCategory.LAWS,
];

function DocumentGrid({ documents }: { documents: LibraryDocument[] }) {
  const t = useTranslations("library");
  const tCommon = useTranslations("common");

  if (!documents.length) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/50 px-4 py-12 text-center text-sm text-muted-foreground">
        {t("emptyCategory")}
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {documents.map((doc) => (
        <Card key={doc.id} className="border-border shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-start gap-3 pb-2">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <FileText className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1 text-start">
              <CardTitle className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                {doc.title}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {format(new Date(doc.uploadedAt), "yyyy-MM-dd")} · {doc.uploadedByName}
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Button variant="outline" size="sm" className="w-full gap-2" asChild>
              <a href={doc.fileUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
                {tCommon("download")}
              </a>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function LibraryView({ documents }: { documents: LibraryDocument[] }) {
  const t = useTranslations("library");

  return (
    <Tabs defaultValue={LegalDocumentCategory.CONTRACT_TEMPLATE}>
      <TabsList className="mb-4 flex h-auto flex-wrap gap-1">
        {TAB_CATEGORIES.map((category) => (
          <TabsTrigger key={category} value={category} className="text-xs sm:text-sm">
            {t(`tab_${category}`)}
          </TabsTrigger>
        ))}
      </TabsList>

      {TAB_CATEGORIES.map((category) => (
        <TabsContent key={category} value={category}>
          <DocumentGrid documents={documents.filter((d) => d.category === category)} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
