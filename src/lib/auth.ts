import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compareSync } from "bcryptjs";
import { DefaultSession } from "next-auth";
import { getServerSession } from "next-auth/next";
import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_SECRET = process.env.NEXTAUTH_SECRET || 'development-fallback-key';

// Sign a session token: HMAC-SHA256(email, secret)
export function signSession(email: string): string {
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(email);
  const signature = hmac.digest('hex');
  return `${email}:${signature}`;
}

// Verify a signed session token
export function verifySession(token: string): string | null {
  const parts = token.split(':');
  if (parts.length < 2) return null;
  const signature = parts.pop()!;
  const email = parts.join(':');
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(email);
  const expected = hmac.digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  return email;
}

// Get authenticated user email from request
export async function getAuthenticatedUser(): Promise<string | null> {
  // Try NextAuth session first
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) return session.user.email;
  } catch {}

  // Fall back to signed cookie
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  if (sessionCookie) {
    return verifySession(sessionCookie);
  }

  return null;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = compareSync(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
