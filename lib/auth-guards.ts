import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import type { Permission } from "@/lib/permissions/constants";
import type { Session } from "next-auth";

export const UNAUTHORIZED_ERROR = "Unauthorized";
export const FORBIDDEN_ERROR = "Forbidden";
export const PASSWORD_CHANGE_REQUIRED_ERROR =
  "Password change required before accessing this resource.";

export type AuthenticatedSession = Session & {
  user: Session["user"] & { id: string; role: import("@prisma/client").Role };
};

export type ActionGuardFail = { success: false; error: string };
export type ActionGuardOk<T extends object = { session: AuthenticatedSession }> = {
  success: true;
} & T;

export async function getAuthenticatedSession(): Promise<AuthenticatedSession | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    return null;
  }
  return session as AuthenticatedSession;
}

export function isPasswordChangeRequired(session: AuthenticatedSession): boolean {
  return Boolean(session.user.requiresPasswordChange);
}

export function passwordChangeRequiredResult(): ActionGuardFail {
  return { success: false, error: PASSWORD_CHANGE_REQUIRED_ERROR };
}

export function unauthorizedResult(): ActionGuardFail {
  return { success: false, error: UNAUTHORIZED_ERROR };
}

export function forbiddenResult(): ActionGuardFail {
  return { success: false, error: FORBIDDEN_ERROR };
}

/** Auth only — allows trapped users (setup-password, sign-out). */
export async function requireAuthenticatedOnly(): Promise<
  ActionGuardOk | ActionGuardFail
> {
  const session = await getAuthenticatedSession();
  if (!session) {
    return unauthorizedResult();
  }
  return { success: true, session };
}

/** Auth + password configured — use for all mutations and protected APIs. */
export async function requireAuthenticatedSession(): Promise<
  ActionGuardOk | ActionGuardFail
> {
  const session = await getAuthenticatedSession();
  if (!session) {
    return unauthorizedResult();
  }
  if (isPasswordChangeRequired(session)) {
    return passwordChangeRequiredResult();
  }
  return { success: true, session };
}

export async function requirePermission(
  permission: Permission
): Promise<ActionGuardOk | ActionGuardFail> {
  const gate = await requireAuthenticatedSession();
  if (!gate.success) {
    return gate;
  }
  const allowed = await hasPermission(
    gate.session.user.id,
    permission,
    gate.session.user.role
  );
  if (!allowed) {
    return forbiddenResult();
  }
  return gate;
}

export async function requireApiSession(): Promise<
  { session: AuthenticatedSession } | { response: NextResponse }
> {
  const session = await getAuthenticatedSession();
  if (!session) {
    return { response: NextResponse.json({ error: UNAUTHORIZED_ERROR }, { status: 401 }) };
  }
  if (isPasswordChangeRequired(session)) {
    return {
      response: NextResponse.json(
        { error: PASSWORD_CHANGE_REQUIRED_ERROR },
        { status: 403 }
      ),
    };
  }
  return { session };
}

export async function requireApiPermission(
  permission: Permission
): Promise<{ session: AuthenticatedSession } | { response: NextResponse }> {
  const gate = await requireApiSession();
  if ("response" in gate) {
    return gate;
  }
  const allowed = await hasPermission(
    gate.session.user.id,
    permission,
    gate.session.user.role
  );
  if (!allowed) {
    return { response: NextResponse.json({ error: FORBIDDEN_ERROR }, { status: 403 }) };
  }
  return gate;
}

export async function requireApiAnyPermission(
  permissions: Permission[]
): Promise<{ session: AuthenticatedSession } | { response: NextResponse }> {
  const gate = await requireApiSession();
  if ("response" in gate) {
    return gate;
  }

  for (const permission of permissions) {
    const allowed = await hasPermission(
      gate.session.user.id,
      permission,
      gate.session.user.role
    );
    if (allowed) {
      return gate;
    }
  }

  return { response: NextResponse.json({ error: FORBIDDEN_ERROR }, { status: 403 }) };
}
