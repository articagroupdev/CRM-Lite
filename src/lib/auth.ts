import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const isProduction = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true, email: true, name: true, image: true,
            role: true, password: true, isActive: true,
            deletedAt: true, emailVerified: true,
          },
        });

        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        if (user.deletedAt) throw new Error("USER_INACTIVE");
        if (!user.isActive) throw new Error("USER_INACTIVE");
        if (!user.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          // Don't pass image here — base64 avatars bloat the JWT to 270KB+
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session) {
        if (session.name !== undefined) token.name = session.name;
        if (session.image !== undefined) token.picture = session.image;
      }
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        // NextAuth sets token.picture = user.image by default before this callback.
        // If image is a base64 data URL it bloats the JWT to 270KB+, so we remove it.
        delete token.picture;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id   = token.id as string;
        session.user.role = token.role as string;
        if (token.picture) session.user.image = token.picture as string;
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
  secret:
    process.env.NEXTAUTH_SECRET ??
    (!isProduction ? "dev-secret-crm-lite" : undefined),
  debug: !isProduction,
};
