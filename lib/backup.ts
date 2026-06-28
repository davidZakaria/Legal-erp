import { format } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function buildBackupFileName(date = new Date()) {
  return `NJD_Backup_${format(date, "yyyyMMdd")}.json`;
}

export async function exportDatabaseJson() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: {
      users: await prisma.user.findMany(),
      auditLogs: await prisma.auditLog.findMany(),
      projects: await prisma.project.findMany(),
      contracts: await prisma.contract.findMany(),
      gafiTasks: await prisma.gAFITask.findMany(),
      subsidiaryCompanies: await prisma.subsidiaryCompany.findMany(),
      assemblyArchives: await prisma.assemblyArchive.findMany(),
      lawsuits: await prisma.lawsuit.findMany(),
      lawsuitAttachments: await prisma.lawsuitAttachment.findMany(),
      courtSessions: await prisma.courtSession.findMany(),
      prosecutions: await prisma.prosecution.findMany(),
      legalTasks: await prisma.legalTask.findMany(),
      powerOfAttorneys: await prisma.powerOfAttorney.findMany(),
      executionRequests: await prisma.executionRequest.findMany(),
      expenses: await prisma.expense.findMany(),
      legalDocuments: await prisma.legalDocument.findMany(),
      courtLookups: await prisma.courtLookup.findMany(),
      policeStationLookups: await prisma.policeStationLookup.findMany(),
      expertOfficeLookups: await prisma.expertOfficeLookup.findMany(),
      legalNotices: await prisma.legalNotice.findMany(),
      backupLogs: await prisma.backupLog.findMany(),
    },
  };
}

export function stringifyBackup(payload: unknown) {
  return JSON.stringify(
    payload,
    (_k, value) => {
      if (typeof value === "bigint") return value.toString();
      if (value instanceof Prisma.Decimal) return value.toString();
      if (value instanceof Date) return value.toISOString();
      return value;
    },
    2
  );
}
