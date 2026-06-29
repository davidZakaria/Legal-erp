import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyTurnstileToken } from "@/lib/turnstile";
import {
  consumeTurnstilePassCookie,
  hasValidTurnstilePassCookie,
  verifyTurnstilePassToken,
} from "@/lib/turnstile-pass";
import { userRequiresTwoFactor } from "@/lib/auth-utils";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        turnstileToken: { label: "Turnstile", type: "text" },
        turnstilePass: { label: "Turnstile Pass", type: "text" },
        twoFactorPass: { label: "Two Factor Pass", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = (credentials.email as string).trim().toLowerCase();
        const password = credentials.password as string;
        const turnstileToken = credentials.turnstileToken as string | undefined;
        const turnstilePass = credentials.turnstilePass as string | undefined;
        const twoFactorPass = credentials.twoFactorPass as string | undefined;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || user.isActive === false) {
          if (!user) {
            console.error("[auth] authorize: user not found", email);
          } else {
            console.error("[auth] authorize: account inactive", email);
          }
          return null;
        }

        const needs2FA = userRequiresTwoFactor(user);

        if (needs2FA) {
          const { hasValidTwoFactorPassCookie, consumeTwoFactorPassCookie, verifyTwoFactorPassToken } =
            await import("@/lib/two-factor-cookie");
          const { hasValidTrustedDeviceCookie } = await import("@/lib/two-factor-trust");
          const trustedDevice = await hasValidTrustedDeviceCookie(user.id);
          const cookieOk = await hasValidTwoFactorPassCookie(user.id);
          const tokenOk = twoFactorPass
            ? verifyTwoFactorPassToken(twoFactorPass, user.id)
            : false;
          if (!trustedDevice && !cookieOk && !tokenOk) {
            console.error("[auth] authorize: 2FA pass missing for", email);
            return null;
          }
          if (cookieOk) {
            await consumeTwoFactorPassCookie(user.id);
          }
        } else {
          let turnstileVerified = Boolean(
            turnstilePass && verifyTurnstilePassToken(turnstilePass, email)
          );

          if (!turnstileVerified) {
            const turnstileCookieOk = await hasValidTurnstilePassCookie(email);
            if (turnstileCookieOk) {
              await consumeTurnstilePassCookie(email);
              turnstileVerified = true;
            }
          }

          if (!turnstileVerified) {
            const turnstileOk = await verifyTurnstileToken(turnstileToken);
            if (!turnstileOk) {
              console.error("[auth] Turnstile rejected for", email);
              return null;
            }
          }
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          console.error("[auth] authorize: password mismatch for", email);
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          requiresPasswordChange: user.requiresPasswordChange,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/ar/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.permissions = user.permissions ?? [];
        token.requiresPasswordChange = user.requiresPasswordChange ?? false;
      }

      if (trigger === "update" && session?.requiresPasswordChange !== undefined) {
        token.requiresPasswordChange = session.requiresPasswordChange as boolean;
      }

      // Keep permissions and role in sync with DB so admin changes apply without re-login.
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            permissions: true,
            requiresPasswordChange: true,
            isActive: true,
          },
        });
        if (dbUser?.isActive) {
          token.role = dbUser.role;
          token.permissions = dbUser.permissions;
          if (trigger !== "update" || session?.requiresPasswordChange === undefined) {
            token.requiresPasswordChange = dbUser.requiresPasswordChange;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as import("@prisma/client").Role;
        session.user.permissions = (token.permissions as string[]) ?? [];
        session.user.requiresPasswordChange = Boolean(token.requiresPasswordChange);
      }
      return session;
    },
  },
  trustHost: true,
});
