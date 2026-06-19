import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Providers } from "@/components/providers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    redirect("/ar/login");
  }

  return (
    <Providers>
      <div className="flex min-h-screen">
        <Sidebar
          userName={user.name ?? ""}
          userRole={user.role}
        />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </Providers>
  );
}
