import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        userOrganisationUnits: {
          select: {
            id: true,
            organisationUnitId: true,
            niveauAcces: true,
            organisationUnit: { select: { id: true, libelle: true } },
          },
        },
        userRoles: {
          select: {
            role: { select: { id: true, code: true, libelle: true } },
          },
        },
      },
      orderBy: { email: 'asc' },
    });
    const normalized = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      userOrganisationUnits: u.userOrganisationUnits,
      roles: u.userRoles.map((ur) => ({ id: ur.role.id, code: ur.role.code, libelle: ur.role.libelle })),
    }));
    return apiSuccess(normalized);
  } catch (e) {
    console.error('GET /api/users', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (currentUser?.role !== 'admin') return apiError('Droits insuffisants', 403, 'FORBIDDEN');
    const body = await request.json();
    const { email, name, password, role, roles: roleCodes } = body;
    if (!email?.trim() || !password) return apiError('Email et mot de passe requis', 400);
    const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (existing) return apiError('Un utilisateur avec cet email existe déjà', 409, 'CONFLICT');
    const hashedPassword = await hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email.trim(),
        name: name?.trim() ?? null,
        password: hashedPassword,
        role: role ?? 'user',
      },
      select: { id: true, email: true, name: true, role: true },
    });
    const codes = Array.isArray(roleCodes) ? roleCodes.filter((c: unknown) => typeof c === 'string' && c.trim()) : [];
    if (codes.length > 0) {
      const roles = await prisma.role.findMany({ where: { code: { in: codes } }, select: { id: true } });
      if (roles.length > 0) {
        await prisma.userRole.createMany({
          data: roles.map((r) => ({ userId: user.id, roleId: r.id })),
          skipDuplicates: true,
        });
      }
    }
    const withRoles = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        userRoles: { select: { role: { select: { id: true, code: true, libelle: true } } } },
      },
    });
    const payload = withRoles
      ? {
          id: withRoles.id,
          email: withRoles.email,
          name: withRoles.name,
          role: withRoles.role,
          roles: withRoles.userRoles.map((ur) => ({ id: ur.role.id, code: ur.role.code, libelle: ur.role.libelle })),
        }
      : user;
    return apiSuccess(payload, 201);
  } catch (e) {
    console.error('POST /api/users', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}
