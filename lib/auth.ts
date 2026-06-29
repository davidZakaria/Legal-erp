import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { verifyTurnstilePassToken } from "@/lib/turnstile-pass";
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
          return null;
        }

        const needs2FA = userRequiresTwoFactor(user);

        if (needs2FA) {
          const { hasValidTwoFactorPassCookie, consumeTwoFactorPassCookie, verifyTwoFactorPassToken } =
            await import("@/lib/two-factor-cookie");
          const cookieOk = await hasValidTwoFactorPassCookie(user.id);
          const tokenOk = twoFactorPass
            ? verifyTwoFactorPassToken(twoFactorPass, user.id)
            : false;
          if (!cookieOk && !tokenOk) {
            return null;
          }
          if (cookieOk) {
            await consumeTwoFactorPassCookie(user.id);
          }
        } else {
          const turnstileAlreadyVerified =
            turnstilePass && verifyTurnstilePassToken(turnstilePass, email);
          if (!turnstileAlreadyVerified) {
            const turnstileOk = await verifyTurnstileToken(turnstileToken);
            if (!turnstileOk) {
              return null;
            }
          }
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
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
