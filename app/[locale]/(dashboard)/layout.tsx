import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { Providers } from "@/components/providers";

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
    redirect("/ar/login");
  }

  return (
    <Providers>
      <div className="flex min-h-screen">
        <Sidebar userRole={user.role} />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopNavbar
            userName={user.name ?? ""}
            userRole={user.role}
            locale={locale}
          />
          <main className="flex-1 overflow-auto bg-slate-50 p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}
