import path from "path";

export function getLibraryUploadDir(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "public", "uploads", "library");
}

export function getLawsuitUploadDir(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "public", "uploads", "lawsuits");
}

export function getExpenseReceiptUploadDir(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "public", "uploads", "expenses");
}

export function getAssemblyUploadDir(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "public", "uploads", "assemblies");
}

export function getContractUploadDir(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "uploads", "contracts");
}

export function joinStoredUploadFile(uploadDir: string, storedName: string): string {
  return path.join(uploadDir, storedName);
}
