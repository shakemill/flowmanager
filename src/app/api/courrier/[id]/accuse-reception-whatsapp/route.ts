import { NextRequest } from 'next/server';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import twilio from 'twilio';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';
import { canActOnCourrier } from '@/lib/courrier-auth';

function normalizeWhatsAppTo(telephone: string): string {
  const tel = String(telephone).replace(/\s+/g, '').replace(/^0/, '237');
  const digits = tel.replace(/\D/g, '');
  if (digits.length < 9) return '';
  const e164 = digits.startsWith('237') ? digits : '237' + digits;
  return `whatsapp:+${e164}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() ?? '';
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? '';
    const from = process.env.TWILIO_WHATSAPP_FROM?.trim() ?? '';
    const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID?.trim() ?? '';

    if (!accountSid || !authToken || !from || !contentSid) {
      const missing: string[] = [];
      if (!accountSid) missing.push('TWILIO_ACCOUNT_SID');
      if (!authToken) missing.push('TWILIO_AUTH_TOKEN');
      if (!from) missing.push('TWILIO_WHATSAPP_FROM');
      if (!contentSid) missing.push('TWILIO_WHATSAPP_CONTENT_SID');
      return apiError(
        `Configuration Twilio manquante : ${missing.join(', ')}. Vérifiez le fichier .env à la racine du projet et redémarrez le serveur (pnpm dev).`,
        500,
        'INTERNAL_ERROR'
      );
    }
    if (!accountSid.startsWith('AC') || accountSid.length !== 34) {
      return apiError(
        'TWILIO_ACCOUNT_SID invalide : doit commencer par AC et faire 34 caractères. Copiez-le depuis la console Twilio (dashboard).',
        500,
        'INTERNAL_ERROR'
      );
    }
    if (authToken.length !== 32) {
      return apiError(
        'TWILIO_AUTH_TOKEN invalide : doit faire 32 caractères. Copiez le token depuis la console Twilio (Account → Auth Token, bouton Show) ou générez-en un nouveau.',
        500,
        'INTERNAL_ERROR'
      );
    }

    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');
    const { id: courrierId } = await params;
    const canAct = await canActOnCourrier(courrierId, userId);
    if (!canAct) return apiError('Vous n\'êtes pas destinataire de ce courrier.', 403, 'FORBIDDEN');
    const body = await request.json().catch(() => ({}));
    const customVariables = body.contentVariables as Record<string, string> | undefined;

    const courrier = await prisma.courrier.findUnique({
      where: { id: courrierId },
      include: { expediteur: true },
    });
    if (!courrier) return apiError('Courrier introuvable', 404, 'NOT_FOUND');

    const telephone = courrier.expediteur?.telephone?.trim();
    if (!telephone) {
      return apiError(
        'L\'expéditeur n\'a pas de numéro de téléphone enregistré. Impossible d\'envoyer l\'accusé par WhatsApp.',
        400
      );
    }

    const to = normalizeWhatsAppTo(telephone);
    if (!to) {
      return apiError('Numéro de téléphone invalide pour WhatsApp.', 400);
    }

    const dateReception = format(new Date(courrier.dateArrivee), 'dd/MM/yyyy', { locale: fr });
    const contentVariables =
      customVariables && typeof customVariables === 'object'
        ? JSON.stringify(customVariables)
        : JSON.stringify({
            '1': dateReception,
            '2': courrier.numero,
            '3': (courrier.objet ?? '').slice(0, 100),
          });

    const client = twilio(accountSid, authToken);
    const message = await client.messages.create({
      from,
      to,
      contentSid,
      contentVariables,
    });

    await prisma.accuseReception.create({
      data: {
        courrierId,
        type: 'accuse_standard',
        destinataire: telephone,
        modeEnvoi: 'whatsapp',
        statut: 'envoye',
        corpsMessage: `Twilio SID: ${message.sid}`,
      },
    });

    return apiSuccess({ sid: message.sid, status: message.status }, 201);
  } catch (e) {
    console.error('POST /api/courrier/[id]/accuse-reception-whatsapp', e);
    const err = e as { code?: number; message?: string };
    if (err.code === 20003) {
      return apiError(
        'Identifiants Twilio refusés (erreur 20003). Solutions : 1) Régénérez un Auth Token dans la console Twilio (Account → API keys & tokens) et remplacez TWILIO_AUTH_TOKEN dans .env. 2) Vérifiez que TWILIO_ACCOUNT_SID correspond au même compte. 3) Redémarrez le serveur après modification du .env.',
        401,
        'UNAUTHORIZED'
      );
    }
    const message = err?.message ? String(err.message) : 'Erreur lors de l\'envoi WhatsApp';
    return apiError(message, 500, 'INTERNAL_ERROR');
  }
}
