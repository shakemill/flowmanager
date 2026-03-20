import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';
import { canEnregistrerCourrier } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { getCourrierVisibilityWhere } from '@/lib/courrier-auth';

async function generateNumero(): Promise<string> {
  const year = new Date().getFullYear();
  const last = await prisma.courrier.findFirst({
    where: { numero: { startsWith: String(year) } },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  });
  const seq = last ? parseInt(last.numero.slice(-6), 10) + 1 : 1;
  return `${year}-${String(seq).padStart(6, '0')}`;
}

/** Retourne les ids des unités de l'utilisateur + toutes les unités descendantes (enfants, petits-enfants…). */
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');
    const priorite = searchParams.get('priorite');
    const statut = searchParams.get('statut');
    const entiteId = searchParams.get('entiteId');
    const dateDebut = searchParams.get('dateDebut');
    const dateFin = searchParams.get('dateFin');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (priorite) where.priorite = priorite;
    if (statut) where.statut = statut;
    if (entiteId) where.entiteTraitanteId = entiteId;
    if (dateDebut || dateFin) {
      where.dateArrivee = {};
      if (dateDebut) (where.dateArrivee as Record<string, string>).gte = new Date(dateDebut).toISOString();
      if (dateFin) (where.dateArrivee as Record<string, string>).lte = new Date(dateFin).toISOString();
    }

    const userId = await getCurrentUserId();
    if (view && userId) {
      const myDirectUnitIds = await prisma.userOrganisationUnit.findMany({
        where: { userId },
        select: { organisationUnitId: true },
      }).then((r) => r.map((x) => x.organisationUnitId));
      const unitIds = await getUnitIdsWithDescendants(myDirectUnitIds);
      switch (view) {
        case 'a_traiter': {
          const orClauses: Record<string, unknown>[] = [{ assignedToId: userId }];
          // Le récipiendaire de l'entité traitante doit voir son courrier à traiter
          orClauses.push({ entiteTraitante: { recipiendaireId: userId } });
          if (unitIds.length) {
            orClauses.push({
              entiteTraitanteId: { in: unitIds },
              statut: { in: ['ENREGISTRE', 'EN_TRAITEMENT'] },
              OR: [{ assignedToId: null }, { assignedToId: userId }],
            });
          }
          where.AND = [{ statut: { not: 'ANNULE' } }, { OR: orClauses }];

          // Exclure les courriers que l'utilisateur a lui-même transférés (dernier transfert = lui)
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
    }

    if (userId) {
      const visibilityClause = await getCourrierVisibilityWhere(userId);
      const existingAnd = Array.isArray(where.AND) ? where.AND : (where.AND != null ? [where.AND] : []);
      where.AND = [visibilityClause, ...existingAnd];
    }

    const [courriers, total] = await Promise.all([
      prisma.courrier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          expediteur: { select: { id: true, nom: true, type: true, email: true, raisonSociale: true } },
          entiteTraitante: { select: { id: true, libelle: true } },
          typologie: { select: { id: true, libelle: true, parent: { select: { libelle: true } } } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.courrier.count({ where }),
    ]);

    return apiSuccess({ courriers, total, page, limit });
  } catch (e) {
    console.error('GET /api/courrier', e);
    const message = process.env.NODE_ENV === 'development' && e instanceof Error
      ? `Erreur lors de la récupération des courriers: ${e.message}`
      : 'Erreur lors de la récupération des courriers';
    return apiError(message, 500, 'INTERNAL_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    const canRegister = await canEnregistrerCourrier();
    if (!canRegister) return apiError('Droits insuffisants : rôle « Enregistrement du courrier » requis', 403, 'FORBIDDEN');

    const body = await request.json();
    const {
      priorite,
      dateCourrier,
      dateArrivee,
      objet,
      expediteurId,
      entiteTraitanteId,
      typologieId,
      documentPrincipalPath,
      banetteId,
    } = body;

    if (!objet || !expediteurId || !entiteTraitanteId || !typologieId || !dateCourrier || !dateArrivee) {
      return apiError('Champs requis: objet, expediteurId, entiteTraitanteId, typologieId, dateCourrier, dateArrivee', 400);
    }

    const userId = await getCurrentUserId();
    const numero = await generateNumero();

    const courrier = await prisma.courrier.create({
      data: {
        numero,
        priorite: priorite ?? 'NORMAL',
        dateCourrier: new Date(dateCourrier),
        dateArrivee: new Date(dateArrivee),
        objet: String(objet).trim(),
        expediteurId,
        entiteTraitanteId,
        typologieId,
        documentPrincipalPath: documentPrincipalPath ?? null,
        banetteId: banetteId ?? null,
        createdById: userId ?? undefined,
      },
      include: {
        expediteur: { select: { id: true, nom: true, type: true, email: true, raisonSociale: true } },
        entiteTraitante: { select: { id: true, libelle: true } },
        typologie: { select: { id: true, libelle: true, parent: { select: { libelle: true } } } },
      },
    });

    await logAudit('creation', courrier.id, { numero: courrier.numero, objet: courrier.objet });
    return apiSuccess(courrier, 201);
  } catch (e) {
    console.error('POST /api/courrier', e);
    return apiError('Erreur lors de la création du courrier', 500, 'INTERNAL_ERROR');
  }
}
