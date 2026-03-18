import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';
import { getTransporter, getMailFrom } from '@/lib/email';
import { canActOnCourrier } from '@/lib/courrier-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');
    const { id: courrierId } = await params;
    const canAct = await canActOnCourrier(courrierId, userId);
    if (!canAct) return apiError('Vous n\'êtes pas destinataire de ce courrier.', 403, 'FORBIDDEN');
    const body = await request.json();
    const { type, destinataire, modeEnvoi, corpsMessage, sujet } = body;

    const courrier = await prisma.courrier.findUnique({
      where: { id: courrierId },
      include: { expediteur: true },
    });
    if (!courrier) return apiError('Courrier introuvable', 404, 'NOT_FOUND');

    const emailDestinataire = (destinataire ?? courrier.expediteur?.email ?? '').trim();
    if (!emailDestinataire) {
      return apiError('L\'expéditeur n\'a pas d\'adresse email enregistrée. Impossible d\'envoyer l\'accusé de réception.', 400);
    }

    const accuse = await prisma.accuseReception.create({
      data: {
        courrierId,
        type: type ?? 'accuse_standard',
        destinataire: emailDestinataire,
        modeEnvoi: modeEnvoi ?? 'email',
        statut: 'envoye',
        corpsMessage: corpsMessage ?? null,
      },
    });

    const transporter = getTransporter();
    const from = getMailFrom();
    const subject = (sujet ?? `Accusé de réception - Courrier ${courrier.numero}`).trim();
    const html = corpsMessage ?? `<p>Nous accusons réception de votre courrier (réf. ${courrier.numero}).</p>`;

    if (transporter) {
      try {
        await transporter.sendMail({
          from,
          to: emailDestinataire,
          subject,
          html,
        });
      } catch (err) {
        console.error('Envoi email accusé de réception', err);
        await prisma.accuseReception.update({
          where: { id: accuse.id },
          data: { statut: 'echec_envoi' },
        });
        return apiError(
          'L\'accusé a été enregistré mais l\'envoi par email a échoué. Vérifiez la configuration SMTP.',
          500,
          'INTERNAL_ERROR'
        );
      }
    }

    return apiSuccess({ accuse, emailSent: !!transporter }, 201);
  } catch (e) {
    console.error('POST /api/courrier/[id]/accuse-reception', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}
