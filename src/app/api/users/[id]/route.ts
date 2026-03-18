import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');

    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true },
    });
    if (currentUser?.role !== 'admin') return apiError('Droits insuffisants', 403, 'FORBIDDEN');

    const { id } = await params;
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!target) return apiError('Utilisateur introuvable', 404, 'NOT_FOUND');

    const body = await request.json();
    const { email, name, role, password, roles: roleCodes } = body;

    const data: { email?: string; name?: string | null; role?: string; password?: string } = {};
    if (typeof email === 'string' && email.trim()) {
      const trimmed = email.trim();
      const existing = await prisma.user.findFirst({
        where: { email: trimmed, id: { not: id } },
      });
      if (existing) return apiError('Un utilisateur avec cet email existe déjà', 409, 'CONFLICT');
      data.email = trimmed;
    }
    if (typeof name === 'string') data.name = name.trim() || null;
    if (typeof role === 'string' && (role === 'user' || role === 'admin')) {
      if (role === 'admin' || target.role === 'admin') {
        const adminCount = await prisma.user.count({ where: { role: 'admin' } });
        if (target.role === 'admin' && adminCount <= 1 && role !== 'admin') {
          return apiError('Impossible de retirer le dernier administrateur', 400, 'BAD_REQUEST');
        }
      }
      data.role = role;
    }
    if (typeof password === 'string' && password.length > 0) {
      data.password = await hash(password, 10);
    }

    const codes = Array.isArray(roleCodes) ? roleCodes.filter((c: unknown) => typeof c === 'string' && c.trim()) : null;

    if (Object.keys(data).length === 0 && codes === null) {
      const current = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          userOrganisationUnits: { select: { id: true, organisationUnitId: true, niveauAcces: true, organisationUnit: { select: { id: true, libelle: true } } } },
          userRoles: { select: { role: { select: { id: true, code: true, libelle: true } } } },
        },
      });
      if (!current) return apiSuccess(target);
      return apiSuccess({
        ...current,
        roles: current.userRoles.map((ur) => ({ id: ur.role.id, code: ur.role.code, libelle: ur.role.libelle })),
        userRoles: undefined,
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
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
        userRoles: { select: { role: { select: { id: true, code: true, libelle: true } } } },
      },
    });

    if (codes !== null) {
      await prisma.userRole.deleteMany({ where: { userId: id } });
      if (codes.length > 0) {
        const roles = await prisma.role.findMany({ where: { code: { in: codes } }, select: { id: true } });
        if (roles.length > 0) {
          await prisma.userRole.createMany({
            data: roles.map((r) => ({ userId: id, roleId: r.id })),
            skipDuplicates: true,
          });
        }
      }
      const withRoles = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          userOrganisationUnits: { select: { id: true, organisationUnitId: true, niveauAcces: true, organisationUnit: { select: { id: true, libelle: true } } } },
          userRoles: { select: { role: { select: { id: true, code: true, libelle: true } } } },
        },
      });
      if (withRoles) {
        return apiSuccess({
          ...withRoles,
          roles: withRoles.userRoles.map((ur) => ({ id: ur.role.id, code: ur.role.code, libelle: ur.role.libelle })),
          userRoles: undefined,
        });
      }
    }

    return apiSuccess({
      ...updated,
      roles: updated.userRoles.map((ur) => ({ id: ur.role.id, code: ur.role.code, libelle: ur.role.libelle })),
      userRoles: undefined,
    });
  } catch (e) {
    console.error('PATCH /api/users/[id]', e);
    return apiError('Erreur lors de la mise à jour', 500, 'INTERNAL_ERROR');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');

    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true },
    });
    if (currentUser?.role !== 'admin') return apiError('Droits insuffisants', 403, 'FORBIDDEN');

    const { id } = await params;
    if (id === currentUserId) return apiError('Vous ne pouvez pas supprimer votre propre compte', 400, 'BAD_REQUEST');

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!target) return apiError('Utilisateur introuvable', 404, 'NOT_FOUND');

    const adminCount = await prisma.user.count({ where: { role: 'admin' } });
    if (target.role === 'admin' && adminCount <= 1) {
      return apiError('Impossible de supprimer le dernier administrateur', 400, 'BAD_REQUEST');
    }

    await prisma.user.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (e) {
    console.error('DELETE /api/users/[id]', e);
    return apiError('Erreur lors de la suppression', 500, 'INTERNAL_ERROR');
  }
}
