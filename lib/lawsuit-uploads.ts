import path from "path";
import fs from "fs/promises";
import {
  getLawsuitUploadDir,
  joinStoredUploadFile,
} from "@/lib/upload-paths";

export { getLawsuitUploadDir, joinStoredUploadFile } from "@/lib/upload-paths";

export function lawsuitAttachmentPublicUrl(fileName: string): string {
  return `/uploads/lawsuits/${fileName}`;
}

export async function resolveLawsuitAttachmentPath(fileUrl: string): Promise<string> {
  const fileName = path.basename(fileUrl);
  const resolvedPath = joinStoredUploadFile(getLawsuitUploadDir(), fileName);

  const uploadDir = getLawsuitUploadDir();
  if (!resolvedPath.startsWith(uploadDir + path.sep) && resolvedPath !== uploadDir) {
    throw new Error("Invalid file path");
  }

  await fs.access(resolvedPath);
  return resolvedPath;
}
