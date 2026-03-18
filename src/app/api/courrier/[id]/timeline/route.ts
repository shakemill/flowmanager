import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';
import { canSeeCourrier } from '@/lib/courrier-auth';

type TimelineItem =
  | {
      type: 'audit';
      id: string;
      date: string;
      action: string;
      user: { name: string | null; email: string };
      note?: string;
      details?: Record<string, unknown>;
    }
  | {
      type: 'transfert';
      id: string;
      date: string;
      fromUser: { name: string | null; email: string } | null;
      toUser: { name: string | null; email: string } | null;
      toUnit: { libelle: string } | null;
      note: string | null;
    }
  | {
      type: 'visa';
      id: string;
      date: string;
      action: string;
      etapeWorkflow: string;
      user: { name: string | null; email: string };
      commentaire: string | null;
    }
  | {
      type: 'visa_reponse';
      id: string;
      date: string;
      user: { name: string | null; email: string };
      statut: string;
      commentaire: string | null;
    };

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');
    const { id: courrierId } = await params;
    const canSee = await canSeeCourrier(courrierId, userId);
    if (!canSee) return apiError('Vous n\'avez pas accès à ce courrier.', 403, 'FORBIDDEN');

    const [auditLogs, transferts, instance, visaDemandes] = await Promise.all([
      prisma.auditLog.findMany({
        where: { courrierId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.courrierTransfert.findMany({
        where: { courrierId },
        orderBy: { createdAt: 'desc' },
        include: {
          fromUser: { select: { name: true, email: true } },
          toUser: { select: { name: true, email: true } },
          toUnit: { select: { libelle: true } },
        },
      }),
      prisma.instanceCircuit.findFirst({
        where: { courrierId },
        orderBy: { createdAt: 'desc' },
        include: {
          historiqueVisas: {
            include: { user: { select: { name: true, email: true } }, etapeWorkflow: { select: { libelle: true } } },
            orderBy: { date: 'asc' },
          },
        },
      }),
      prisma.visaDemande.findMany({
        where: { courrierId, dateReponse: { not: null } },
        orderBy: { dateReponse: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      }),
    ]);

    const items: TimelineItem[] = [];

    for (const log of auditLogs) {
      // Ne pas ajouter les audit "transfert" : ils sont déjà affichés via CourrierTransfert
      if (log.action === 'transfert') continue;
      // Ne pas ajouter les audit "visa_demande_reponse" : déjà affichés via VisaDemande (type visa_reponse)
      if (log.action === 'visa_demande_reponse') continue;
      const details = log.details as Record<string, unknown> | null;
      const note = details && typeof details.note === 'string' ? details.note : undefined;
      items.push({
        type: 'audit',
        id: log.id,
        date: log.createdAt.toISOString(),
        action: log.action,
        user: log.user,
        note,
        details: details ?? undefined,
      });
    }

    for (const t of transferts) {
      items.push({
        type: 'transfert',
        id: t.id,
        date: t.createdAt.toISOString(),
        fromUser: t.fromUser,
        toUser: t.toUser,
        toUnit: t.toUnit,
        note: t.note,
      });
    }

    if (instance?.historiqueVisas) {
      for (const h of instance.historiqueVisas) {
        items.push({
          type: 'visa',
          id: h.id,
          date: h.date.toISOString(),
          action: h.action,
          etapeWorkflow: h.etapeWorkflow?.libelle ?? '—',
          user: h.user,
          commentaire: h.commentaire,
        });
      }
    }

    for (const v of visaDemandes) {
      if (v.dateReponse) {
        items.push({
          type: 'visa_reponse',
          id: v.id,
          date: v.dateReponse.toISOString(),
          user: v.user,
          statut: v.statut,
          commentaire: v.commentaire,
        });
      }
    }

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return apiSuccess(items);
  } catch (e) {
    console.error('GET /api/courrier/[id]/timeline', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}
