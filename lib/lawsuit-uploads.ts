import path from "path";
import fs from "fs/promises";

export function getLawsuitUploadDir(): string {
  return path.join(process.cwd(), "public", "uploads", "lawsuits");
}

export function lawsuitAttachmentPublicUrl(fileName: string): string {
  return `/uploads/lawsuits/${fileName}`;
}

export async function resolveLawsuitAttachmentPath(fileUrl: string): Promise<string> {
  const uploadDir = getLawsuitUploadDir();
  const fileName = path.basename(fileUrl);
  const resolvedPath = path.resolve(uploadDir, fileName);

  if (!resolvedPath.startsWith(uploadDir + path.sep) && resolvedPath !== uploadDir) {
    throw new Error("Invalid file path");
  }

  await fs.access(resolvedPath);
  return resolvedPath;
}
