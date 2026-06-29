import { prisma } from "@/lib/prisma";

/** Deletes all business records. Users, court/police/expert lookups, and backup logs are kept. */
export async function clearOperationalData() {
  await prisma.auditLog.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.legalDocument.deleteMany({});
  await prisma.lawsuitAttachment.deleteMany({});
  await prisma.executionRequest.deleteMany({});
  await prisma.legalNotice.deleteMany({});
  await prisma.courtSession.deleteMany({});
  await prisma.lawsuit.deleteMany({});
  await prisma.prosecution.deleteMany({});
  await prisma.legalTask.deleteMany({});
  await prisma.powerOfAttorney.deleteMany({});
  await prisma.contract.deleteMany({});
  await prisma.gAFITask.deleteMany({});
  await prisma.assemblyArchive.deleteMany({});
  await prisma.subsidiaryCompany.deleteMany({});
  await prisma.project.deleteMany({});
}
