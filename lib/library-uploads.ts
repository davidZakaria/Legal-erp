import path from "path";

export function getLibraryUploadDir(): string {
  return path.join(process.cwd(), "public", "uploads", "library");
}

export function libraryDocumentPublicUrl(fileName: string): string {
  return `/uploads/library/${fileName}`;
}
