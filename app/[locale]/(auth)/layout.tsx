import { Providers } from "@/components/providers";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="relative min-h-screen bg-background">
        <div className="absolute end-4 top-4 z-10 flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
        {children}
      </div>
    </Providers>
  );
}
