import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { Providers } from "@/components/providers";
import { getAllLookups } from "@/lib/lookups";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();
  const user = session?.user;
  const { locale } = await params;

  if (!user) {
    redirect(`/${locale}/login`);
  }

  if (user.requiresPasswordChange) {
    redirect(`/${locale}/setup-password`);
  }

  const [lawyers, lawsuits, lookups] = await Promise.all([
    prisma.user.findMany({
      where: { role: Role.LAWYER, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.lawsuit.findMany({
      select: { id: true, caseNumber: true, year: true },
      orderBy: [{ year: "desc" }, { caseNumber: "asc" }],
      take: 100,
    }),
    getAllLookups(),
  ]);

  const lawsuitOptions = lawsuits.map((l) => ({
    id: l.id,
    label: `${l.caseNumber} / ${l.year}`,
  }));

  return (
    <Providers>
      <div className="flex min-h-screen">
        <Sidebar userRole={user.role} userPermissions={user.permissions ?? []} />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopNavbar
            userName={user.name ?? ""}
            userRole={user.role}
            locale={locale}
            lawyers={lawyers}
            lawsuits={lawsuitOptions}
            courtLookups={lookups.courts}
            expertOfficeLookups={lookups.expertOffices}
          />
          <main className="flex-1 overflow-auto bg-muted/40 p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}
