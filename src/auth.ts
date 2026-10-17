import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consume, ipFrom, isOverLimit, LIMITS, recordHit } from "@/lib/rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        // Password guessing: failed attempts are counted per account and
        // per network address, and once either is over its limit every
        // attempt fails — even a correct password — until the window
        // passes. Checked here, not just in the login form, because this
        // endpoint can be called directly.
        const emailKey = `login:email:${email.trim().toLowerCase()}`;
        const ipKey = `login:ip:${ipFrom(request?.headers?.get("x-forwarded-for"))}`;
        if ((await isOverLimit(emailKey, LIMITS.loginEmail)) || (await isOverLimit(ipKey, LIMITS.loginIp))) {
          return null;
        }
        const fail = async () => {
          await recordHit(emailKey);
          await recordHit(ipKey);
          return null;
        };

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash || !user.isActive) return fail();

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) return fail();

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    // Called before a sign-in link is emailed: caps how many links one
    // address can be sent, so the endpoint can't be used to flood an inbox.
    async signIn({ user, email }) {
      if (email?.verificationRequest) {
        const address = user?.email ?? "";
        if (address && !(await consume(`magic:email:${address.toLowerCase()}`, LIMITS.magicLinkEmail))) {
          return false;
        }
      }
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  events: {
    // Flips IMPORTED/INVITED to ACTIVE the moment an account is actually
    // used for the first time — fires for every provider (Credentials and
    // the Resend magic link alike), since both count as a real sign-in.
    // The `status: { not: "ACTIVE" }` filter makes this a no-op write for
    // every already-active login, not just semantically idempotent.
    async signIn({ user }) {
      if (!user?.id) return;
      await prisma.user.updateMany({
        where: { id: user.id, status: { not: "ACTIVE" } },
        data: { status: "ACTIVE" },
      });
    },
  },
});
