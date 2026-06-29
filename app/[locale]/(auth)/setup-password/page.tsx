import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SetupPasswordForm } from "@/components/auth/SetupPasswordForm";

export default async function SetupPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect({ href: "/login", locale });
  }

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: {
      email: true,
      secondaryEmail: true,
      requiresPasswordChange: true,
    },
  });

  if (!user) {
    redirect({ href: "/login", locale });
  } else if (!user.requiresPasswordChange) {
    redirect({ href: "/", locale });
  } else {
    return (
      <SetupPasswordForm
        primaryEmail={user.email}
        hasSecondaryEmail={Boolean(user.secondaryEmail?.trim())}
      />
    );
  }
}
