import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';
import { getCourrierVisibilityWhere } from '@/lib/courrier-auth';

const BANETTE_VIEWS = [
  'a_traiter',
  'mon_service',
  'en_attente_mes_avis',
  'transferes_a_moi',
  'en_attente_avis',
  'retour_avis',
  'archives',
] as const;

async function getUnitIdsWithDescendants(unitIds: string[]): Promise<string[]> {
  if (unitIds.length === 0) return [];
  const all = await prisma.organisationUnit.findMany({
    where: { actif: true },
    select: { id: true, parentId: true },
  });
  const byParent = new Map<string | null, string[]>();
  for (const u of all) {
    const key = u.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(u.id);
  }
  const result = new Set<string>(unitIds);
  const queue = [...unitIds];
  while (queue.length) {
    const id = queue.shift()!;
    const children = byParent.get(id) ?? [];
    for (const c of children) {
      if (!result.has(c)) {
        result.add(c);
        queue.push(c);
      }
    }
  }
  return Array.from(result);
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      const empty = Object.fromEntries(BANETTE_VIEWS.map((v) => [v, 0]));
      return apiSuccess(empty);
    }

    const myDirectUnitIds = await prisma.userOrganisationUnit
      .findMany({
        where: { userId },
        select: { organisationUnitId: true },
      })
      .then((r) => r.map((x) => x.organisationUnitId));
    const unitIds = await getUnitIdsWithDescendants(myDirectUnitIds);

    // Courriers que l'utilisateur a transférés (dernier transfert = lui) — exclus de « à traiter »
    const transfers = await prisma.courrierTransfert.findMany({
      orderBy: { createdAt: 'desc' },
      select: { courrierId: true, fromUserId: true },
    });
    const lastTransferByCourrier = new Map<string, string | null>();
    for (const t of transfers) {
      if (!lastTransferByCourrier.has(t.courrierId)) {
        lastTransferByCourrier.set(t.courrierId, t.fromUserId);
      }
    }
    const transferredByMeIds = [...lastTransferByCourrier.entries()]
      .filter(([, fromUserId]) => fromUserId === userId)
      .map(([courrierId]) => courrierId);

    const visibilityClause = await getCourrierVisibilityWhere(userId);

    const counts: Record<string, number> = Object.fromEntries(BANETTE_VIEWS.map((v) => [v, 0]));

    for (const view of BANETTE_VIEWS) {
      const where: Record<string, unknown> = {};
      try {
        switch (view) {
          case 'a_traiter': {
            const orClauses: Record<string, unknown>[] = [{ assignedToId: userId }];
            if (unitIds.length) {
              orClauses.push({
                entiteTraitanteId: { in: unitIds },
                statut: { in: ['ENREGISTRE', 'EN_TRAITEMENT'] },
                OR: [{ assignedToId: null }, { assignedToId: userId }],
              });
            }
            where.AND = [{ statut: { not: 'ANNULE' } }, { OR: orClauses }];
            if (transferredByMeIds.length > 0) {
              (where.AND as Record<string, unknown>[]).push({ id: { notIn: transferredByMeIds } });
            }
            break;
          }
          case 'mon_service':
            where.entiteTraitanteId = unitIds.length ? { in: unitIds } : { in: [] };
            where.statut = { not: 'ANNULE' };
            break;
          case 'en_attente_mes_avis':
            where.visaDemandes = { some: { userId, statut: 'EN_ATTENTE' } };
            break;
          case 'transferes_a_moi':
            where.assignedToId = userId;
            break;
          case 'en_attente_avis':
            where.visaDemandes = { some: { statut: 'EN_ATTENTE' } };
            where.statut = { not: 'ANNULE' };
            break;
          case 'retour_avis':
            where.statut = { not: 'ANNULE' };
            where.visaDemandes = {
              some: {
                demandeurId: userId,
                dateReponse: { not: null },
              },
            };
            break;
          case 'archives':
            where.statut = 'CLOTURE';
            break;
        }
        where.AND = [visibilityClause, ...(Array.isArray(where.AND) ? where.AND : (where.AND ? [where.AND] : []))];
        counts[view] = await prisma.courrier.count({ where });
      } catch (err) {
        console.error(`GET /api/courrier/counts view=${view}`, err);
      }
    }

    return apiSuccess(counts);
  } catch (e) {
    console.error('GET /api/courrier/counts', e);
    return apiError('Erreur lors du chargement des comptages', 500, 'INTERNAL_ERROR');
  }
}
