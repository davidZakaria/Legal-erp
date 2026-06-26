import path from "path";
import fs from "fs/promises";
import {
  getContractUploadDir,
  joinStoredUploadFile,
} from "@/lib/upload-paths";

export { getContractUploadDir as getUploadDir } from "@/lib/upload-paths";

export async function resolveContractFilePath(fileUrl: string): Promise<string> {
  const fileName = path.basename(fileUrl);
  const resolvedPath = joinStoredUploadFile(getContractUploadDir(), fileName);

  try {
    await fs.access(resolvedPath);
  } catch {
    throw new Error("File not found");
  }

  return resolvedPath;
}
