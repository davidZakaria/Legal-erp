import path from "path";
import fs from "fs/promises";

function getUploadDir(): string {
  return path.join(process.cwd(), "uploads", "contracts");
}

export async function resolveContractFilePath(fileUrl: string): Promise<string> {
  const UPLOAD_DIR = getUploadDir();
  const fileName = path.basename(fileUrl);
  const resolvedPath = path.resolve(UPLOAD_DIR, fileName);

  if (!resolvedPath.startsWith(UPLOAD_DIR + path.sep) && resolvedPath !== UPLOAD_DIR) {
    throw new Error("Invalid file path");
  }

  try {
    await fs.access(resolvedPath);
  } catch {
    throw new Error("File not found");
  }

  return resolvedPath;
}

export { getUploadDir };
