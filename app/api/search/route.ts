import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const LIMIT = 8;

export async function GET(request: NextRequest) {
  const gate = await requireApiSession();
  if ("response" in gate) return gate.response;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({
      lawsuits: [],
      contracts: [],
      prosecutions: [],
      gafi: [],
    });
  }

  const [lawsuits, contracts, prosecutions, gafi] = await Promise.all([
    prisma.lawsuit.findMany({
      where: {
        caseNumber: { contains: q, mode: "insensitive" },
      },
      select: {
        id: true,
        caseNumber: true,
        year: true,
        courtName: true,
        opponentName: true,
      },
      take: LIMIT,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.contract.findMany({
      where: {
        contractorName: { contains: q, mode: "insensitive" },
      },
      select: {
        id: true,
        contractorName: true,
        project: { select: { name: true } },
      },
      take: LIMIT,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.prosecution.findMany({
      where: {
        clientName: { contains: q, mode: "insensitive" },
      },
      select: {
        id: true,
        clientName: true,
        caseNumber: true,
        year: true,
        policeStation: true,
      },
      take: LIMIT,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.gAFITask.findMany({
      where: {
        title: { contains: q, mode: "insensitive" },
      },
      select: {
        id: true,
        title: true,
        taskType: true,
      },
      take: LIMIT,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    lawsuits: lawsuits.map((item) => ({
      id: item.id,
      label: `${item.caseNumber} / ${item.year}`,
      subtitle: `${item.courtName} — ${item.opponentName}`,
      href: "/litigation",
    })),
    contracts: contracts.map((item) => ({
      id: item.id,
      label: item.contractorName,
      subtitle: item.project.name,
      href: "/contracts",
    })),
    prosecutions: prosecutions.map((item) => ({
      id: item.id,
      label: item.clientName,
      subtitle: `${item.caseNumber}/${item.year} — ${item.policeStation}`,
      href: "/prosecutions",
    })),
    gafi: gafi.map((item) => ({
      id: item.id,
      label: item.title,
      subtitle: item.taskType,
      href: "/gafi",
    })),
  });
}
