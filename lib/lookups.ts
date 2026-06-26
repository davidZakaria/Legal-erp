import { prisma } from "@/lib/prisma";

export async function getCourtLookups() {
  return prisma.courtLookup.findMany({ orderBy: { name: "asc" } });
}

export async function getPoliceStationLookups() {
  return prisma.policeStationLookup.findMany({ orderBy: { name: "asc" } });
}

export async function getExpertOfficeLookups() {
  return prisma.expertOfficeLookup.findMany({ orderBy: { name: "asc" } });
}

export async function getProjectLookups() {
  return prisma.project.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, location: true },
  });
}

export type LookupOption = { id: string; name: string };

export async function getAllLookups() {
  const [courts, policeStations, expertOffices, projects] = await Promise.all([
    getCourtLookups(),
    getPoliceStationLookups(),
    getExpertOfficeLookups(),
    getProjectLookups(),
  ]);
  return { courts, policeStations, expertOffices, projects };
}
