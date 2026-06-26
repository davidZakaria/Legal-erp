"use server";

import { cookies } from "next/headers";
import { signOut } from "@/lib/auth";

const TWO_FACTOR_COOKIE = "njd-2fa-pass";

export async function signOutUser(locale: string): Promise<string> {
  const cookieStore = await cookies();
  cookieStore.delete(TWO_FACTOR_COOKIE);

  await signOut({ redirect: false, redirectTo: `/${locale}/login` });

  return `/${locale}/login`;
}
