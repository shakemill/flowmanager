import { NextRequest } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';
import { sendPasswordChangeNotification } from '@/lib/email';

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');

    const body = await request.json();
    const { currentPassword, newPassword } = body;
    if (!currentPassword || typeof currentPassword !== 'string')
      return apiError('Mot de passe actuel requis', 400, 'BAD_REQUEST');
    if (!newPassword || typeof newPassword !== 'string')
      return apiError('Nouveau mot de passe requis', 400, 'BAD_REQUEST');
    if (newPassword.length < MIN_PASSWORD_LENGTH)
      return apiError(`Le nouveau mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`, 400, 'BAD_REQUEST');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, password: true },
    });
    if (!user) return apiError('Utilisateur introuvable', 404, 'NOT_FOUND');
    if (!user.password)
      return apiError('Ce compte n\'utilise pas de mot de passe (connexion externe).', 400, 'BAD_REQUEST');

    const valid = await compare(currentPassword, user.password);
    if (!valid) return apiError('Mot de passe actuel incorrect', 400, 'BAD_REQUEST');

    const hashedPassword = await hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    const emailSent = await sendPasswordChangeNotification(user.email, user.name ?? null);
    return apiSuccess({ emailSent });
  } catch (e) {
    console.error('POST /api/me/change-password', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}
