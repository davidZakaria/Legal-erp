export { getAssemblyUploadDir } from "@/lib/upload-paths";

export function assemblyArchivePublicUrl(fileName: string): string {
  return `/uploads/assemblies/${fileName}`;
}
