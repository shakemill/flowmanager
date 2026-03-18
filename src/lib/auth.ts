import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getServerSession } from 'next-auth';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null;
          const email = credentials.email.trim().toLowerCase();
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              password: true,
            },
          });
          if (!user?.password) return null;
          const ok = await compare(credentials.password, user.password);
          if (!ok) return null;
          let roles: string[] = [];
          try {
            const withRoles = await prisma.user.findUnique({
              where: { id: user.id },
              select: { userRoles: { select: { role: { select: { code: true } } } } },
            });
            roles = (withRoles as { userRoles?: { role: { code: string } }[] } | null)?.userRoles?.map((ur) => ur.role.code) ?? [];
          } catch {
            // Tables Role/UserRole absentes ou erreur : on garde role principal (admin/user) uniquement
          }
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? undefined,
            image: undefined,
            role: user.role,
            roles,
          };
        } catch (err) {
          console.error('[NextAuth authorize error]', err);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id;
        token.role = (user as { role?: string }).role;
        token.roles = (user as { roles?: string[] }).roles ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { roles?: string[] }).roles = (token.roles as string[]) ?? [];
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

export async function getCurrentUserRole(): Promise<string | null> {
  const session = await getSession();
  return (session?.user as { role?: string } | undefined)?.role ?? null;
}

export async function getCurrentUserRoles(): Promise<string[]> {
  const session = await getSession();
  const roles = (session?.user as { roles?: string[] } | undefined)?.roles;
  return Array.isArray(roles) ? roles : [];
}

export async function canEnregistrerCourrier(): Promise<boolean> {
  const role = await getCurrentUserRole();
  const roles = await getCurrentUserRoles();
  return role === 'admin' || roles.includes('enregistrement_courrier');
}

export async function canAccessEparapheur(): Promise<boolean> {
  const role = await getCurrentUserRole();
  const roles = await getCurrentUserRoles();
  return role === 'admin' || roles.includes('eparapheur');
}
