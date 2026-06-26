export { getLibraryUploadDir } from "@/lib/upload-paths";

export function libraryDocumentPublicUrl(fileName: string): string {
  return `/uploads/library/${fileName}`;
}
