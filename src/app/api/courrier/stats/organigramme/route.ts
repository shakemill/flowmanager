import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';
import {
  buildOrganigrammeCourrierWhere,
  getAllActiveOrganisationUnitIds,
  getRecipiendairePerimeterUnitIds,
  getRecipiendaireRootUnitIds,
} from '@/lib/courrier-auth';

function parsePeriod(searchParams: URLSearchParams): { dateFrom: Date; dateTo: Date } {
  const fromStr = searchParams.get('from');
  const toStr = searchParams.get('to');
  let dateFrom: Date;
  let dateTo: Date = new Date();
  dateTo.setHours(23, 59, 59, 999);

  if (toStr) {
    dateTo = new Date(toStr);
    dateTo.setHours(23, 59, 59, 999);
  }
  if (fromStr) {
    dateFrom = new Date(fromStr);
    dateFrom.setHours(0, 0, 0, 0);
  } else {
    dateFrom = new Date(dateTo);
    dateFrom.setFullYear(dateFrom.getFullYear() - 1);
    dateFrom.setHours(0, 0, 0, 0);
  }
  if (dateFrom > dateTo) {
    const t = dateFrom;
    dateFrom = dateTo;
    dateTo = t;
    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);
  }
  return { dateFrom, dateTo };
}

/** Séparateur cohérent avec `buildUnitPathMap` (libellés d’ancêtres › entité courante). */
const HIERARCHY_SEP = ' › ';

/** Affiche au plus les `maxLevels` derniers niveaux (ex. parent + service). */
function hierarchyPathLastNLevels(fullPath: string, maxLevels: number): string {
  const parts = fullPath
    .split(HIERARCHY_SEP)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= maxLevels) return fullPath.trim();
  return parts.slice(-maxLevels).join(HIERARCHY_SEP);
}

function buildUnitPathMap(
  units: { id: string; libelle: string; parentId: string | null }[]
): Map<string, string> {
  const byId = new Map(units.map((u) => [u.id, u]));
  const pathCache = new Map<string, string>();

  function pathOf(id: string): string {
    if (pathCache.has(id)) return pathCache.get(id)!;
    const u = byId.get(id);
    if (!u) {
      pathCache.set(id, id);
      return id;
    }
    const p = u.parentId ? `${pathOf(u.parentId)}${HIERARCHY_SEP}${u.libelle}` : u.libelle;
    pathCache.set(id, p);
    return p;
  }
  for (const u of units) pathOf(u.id);
  return pathCache;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isAdmin = dbUser?.role === 'admin';

    let perimeter: string[];
    let rootIds: string[];
    let statsScope: 'admin' | 'recipiendaire' = 'recipiendaire';

    if (isAdmin) {
      statsScope = 'admin';
      perimeter = await getAllActiveOrganisationUnitIds();
      rootIds = [];
    } else {
      perimeter = await getRecipiendairePerimeterUnitIds(userId);
      if (perimeter.length === 0) {
        return apiError(
          'Accès réservé aux administrateurs ou aux responsables désignés comme récipiendaire sur au moins une unité de l’organigramme.',
          403,
          'FORBIDDEN'
        );
      }
      rootIds = await getRecipiendaireRootUnitIds(userId);
    }

    if (perimeter.length === 0) {
      return apiError('Aucune unité active dans l’organigramme.', 400, 'BAD_REQUEST');
    }

    const { dateFrom, dateTo } = parsePeriod(new URL(request.url).searchParams);
    const courrierWhere = buildOrganigrammeCourrierWhere(perimeter, { dateFrom, dateTo });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const placeholders = perimeter.map(() => '?').join(',');

    const [
      total,
      courriersAujourdhui,
      parStatut,
      parPriorite,
      parEntite,
      typologieGroups,
      expediteurGroups,
      assignedCounts,
      visaByStatut,
      visaByUserStatut,
      transfertTotal,
      transfertByUnit,
      accuseTotal,
      accuseByMode,
      allUnitsForPath,
      timeSeriesRows,
      delaiRows,
      visaDelaiRow,
    ] = await Promise.all([
      prisma.courrier.count({ where: courrierWhere }),
      prisma.courrier.count({
        where: {
          AND: [{ entiteTraitanteId: { in: perimeter } }, { dateArrivee: { gte: todayStart, lt: todayEnd } }],
        },
      }),
      prisma.courrier.groupBy({
        by: ['statut'],
        where: courrierWhere,
        _count: { id: true },
      }),
      prisma.courrier.groupBy({
        by: ['priorite'],
        where: courrierWhere,
        _count: { id: true },
      }),
      prisma.courrier.groupBy({
        by: ['entiteTraitanteId'],
        where: courrierWhere,
        _count: { id: true },
      }),
      prisma.courrier.groupBy({
        by: ['typologieId'],
        where: courrierWhere,
        _count: { id: true },
      }),
      prisma.courrier.groupBy({
        by: ['expediteurId'],
        where: courrierWhere,
        _count: { id: true },
        orderBy: { _count: { expediteurId: 'desc' } },
        take: 15,
      }),
      prisma.courrier.groupBy({
        by: ['assignedToId'],
        where: courrierWhere,
        _count: { id: true },
      }),
      prisma.visaDemande.groupBy({
        by: ['statut'],
        where: { courrier: courrierWhere },
        _count: { id: true },
      }),
      prisma.visaDemande.groupBy({
        by: ['userId', 'statut'],
        where: { courrier: courrierWhere },
        _count: { id: true },
      }),
      prisma.courrierTransfert.count({ where: { courrier: courrierWhere } }),
      prisma.courrierTransfert.groupBy({
        by: ['toUnitId'],
        where: { courrier: courrierWhere, toUnitId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 15,
      }),
      prisma.accuseReception.count({ where: { courrier: courrierWhere } }),
      prisma.accuseReception.groupBy({
        by: ['modeEnvoi'],
        where: { courrier: courrierWhere },
        _count: { id: true },
      }),
      prisma.organisationUnit.findMany({
        where: { actif: true },
        select: {
          id: true,
          libelle: true,
          parentId: true,
          niveau: true,
          ordre: true,
          entiteTraitante: true,
        },
      }),
      prisma.$queryRawUnsafe<Array<{ bucket: string; cnt: bigint }>>(
        `SELECT DATE_FORMAT(dateArrivee, '%Y-%m') AS bucket, COUNT(*) AS cnt
         FROM Courrier
         WHERE entiteTraitanteId IN (${placeholders})
         AND dateArrivee >= ? AND dateArrivee <= ?
         GROUP BY bucket ORDER BY bucket`,
        ...perimeter,
        dateFrom,
        dateTo
      ),
      prisma.$queryRawUnsafe<Array<{ avgDays: number | null; n: bigint }>>(
        `SELECT AVG(DATEDIFF(updatedAt, dateArrivee)) AS avgDays, COUNT(*) AS n
         FROM Courrier
         WHERE entiteTraitanteId IN (${placeholders})
         AND statut IN ('CLOTURE', 'VISÉ')
         AND dateArrivee >= ? AND dateArrivee <= ?`,
        ...perimeter,
        dateFrom,
        dateTo
      ),
      prisma.$queryRawUnsafe<Array<{ avgDays: number | null }>>(
        `SELECT AVG(TIMESTAMPDIFF(SECOND, v.createdAt, v.dateReponse)) / 86400 AS avgDays
         FROM VisaDemande v
         INNER JOIN Courrier c ON c.id = v.courrierId
         WHERE c.entiteTraitanteId IN (${placeholders})
         AND v.dateReponse IS NOT NULL
         AND c.dateArrivee >= ? AND c.dateArrivee <= ?`,
        ...perimeter,
        dateFrom,
        dateTo
      ),
    ]);

    const pathMap = buildUnitPathMap(allUnitsForPath);
    const unitLabel = new Map(allUnitsForPath.map((u) => [u.id, u.libelle]));
    const unitMeta = new Map(
      allUnitsForPath.map((u) => [
        u.id,
        {
          parentId: u.parentId,
          niveau: u.niveau,
          ordre: u.ordre,
          entiteTraitante: u.entiteTraitante,
        },
      ])
    );

    /** Volume par entité (seules les unités avec au moins un courrier sortent du groupBy). */
    const countByEntite = new Map(
      parEntite.map((row) => [row.entiteTraitanteId, row._count.id])
    );

    /** Toutes les sous-unités du périmètre (récipiendaire : arbre sous les racines ; admin : toutes les unités actives), y compris à 0 courrier. */
    const parEntiteEnriched = [...new Set(perimeter)]
      .map((unitId) => {
        const fullPath = pathMap.get(unitId) ?? unitLabel.get(unitId) ?? unitId;
        const meta = unitMeta.get(unitId);
        return {
          unitId,
          libelle: unitLabel.get(unitId) ?? unitId,
          parentId: meta?.parentId ?? null,
          niveau: meta?.niveau ?? 0,
          ordre: meta?.ordre ?? 0,
          entiteTraitante: meta?.entiteTraitante ?? true,
          path: hierarchyPathLastNLevels(fullPath, 2),
          pathFull: fullPath,
          count: countByEntite.get(unitId) ?? 0,
        };
      })
      // Ordre d’affichage « organigramme » géré côté client (tri par parent / ordre) ;
      // liste plate triée par libellé pour une réponse stable.
      .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr', { sensitivity: 'base' }));

    const typologieIds = typologieGroups.map((g) => g.typologieId).filter((id): id is string => id != null);
    const typologies =
      typologieIds.length > 0
        ? await prisma.typologieCourrier.findMany({
            where: { id: { in: typologieIds } },
            select: { id: true, libelle: true, parentId: true, parent: { select: { libelle: true } } },
          })
        : [];
    const typById = new Map(typologies.map((t) => [t.id, t]));
    const parTypologie = typologieGroups.map((g) => {
      const id = g.typologieId;
      if (!id) {
        return { typologieId: null as string | null, libelle: '(Sans typologie)', parentLibelle: null as string | null, count: g._count.id };
      }
      const t = typById.get(id);
      return {
        typologieId: id,
        libelle: t?.libelle ?? id,
        parentLibelle: t?.parent?.libelle ?? null,
        count: g._count.id,
      };
    });

    const expediteurIds = expediteurGroups.map((g) => g.expediteurId);
    const contacts = await prisma.contact.findMany({
      where: { id: { in: expediteurIds } },
      select: { id: true, nom: true, raisonSociale: true, type: true },
    });
    const cById = new Map(contacts.map((c) => [c.id, c]));
    const topExpediteurs = expediteurGroups.map((g) => {
      const c = cById.get(g.expediteurId);
      const nom =
        c?.type === 'SOCIETE' && c.raisonSociale?.trim()
          ? c.raisonSociale.trim()
          : c?.nom ?? g.expediteurId;
      return { contactId: g.expediteurId, nom, count: g._count.id };
    });

    let assigned = 0;
    let unassigned = 0;
    for (const row of assignedCounts) {
      if (row.assignedToId === null) unassigned += row._count.id;
      else assigned += row._count.id;
    }

    const visaUserMap = new Map<
      string,
      { enAttente: number; vise: number; refuse: number }
    >();
    for (const row of visaByUserStatut) {
      if (!visaUserMap.has(row.userId))
        visaUserMap.set(row.userId, { enAttente: 0, vise: 0, refuse: 0 });
      const m = visaUserMap.get(row.userId)!;
      if (row.statut === 'EN_ATTENTE') m.enAttente += row._count.id;
      else if (row.statut === 'VISE') m.vise += row._count.id;
      else if (row.statut === 'REFUSE') m.refuse += row._count.id;
    }
    const visaUserIds = [...visaUserMap.keys()];
    const visaUsers =
      visaUserIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: visaUserIds } },
            select: { id: true, name: true, email: true },
          })
        : [];
    const uById = new Map(visaUsers.map((u) => [u.id, u]));
    const visasParUtilisateur = visaUserIds.map((uid) => {
      const m = visaUserMap.get(uid)!;
      const u = uById.get(uid);
      return {
        userId: uid,
        name: u?.name ?? null,
        email: u?.email ?? '',
        enAttente: m.enAttente,
        vise: m.vise,
        refuse: m.refuse,
      };
    });

    const unitIdsForTransfert = transfertByUnit.map((t) => t.toUnitId).filter((id): id is string => id != null);
    const transUnits =
      unitIdsForTransfert.length > 0
        ? await prisma.organisationUnit.findMany({
            where: { id: { in: unitIdsForTransfert } },
            select: { id: true, libelle: true },
          })
        : [];
    const tuById = new Map(transUnits.map((u) => [u.id, u.libelle]));
    const topDestinationsTransfert = transfertByUnit.map((t) => ({
      unitId: t.toUnitId,
      libelle: t.toUnitId ? tuById.get(t.toUnitId) ?? t.toUnitId : '—',
      count: t._count.id,
    }));

    const delaiCloture = delaiRows[0];
    const delaiVisaJours = visaDelaiRow[0]?.avgDays != null ? Number(visaDelaiRow[0].avgDays) : null;

    return apiSuccess({
      period: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
      perimeter: {
        rootUnitIds: rootIds,
        unitCount: perimeter.length,
        scope: statsScope,
      },
      totals: {
        total,
        courriersAujourdhui,
        assigned,
        unassigned,
      },
      parStatut: Object.fromEntries(parStatut.map((s) => [s.statut, s._count.id])),
      parPriorite: Object.fromEntries(parPriorite.map((p) => [p.priorite, p._count.id])),
      parEntite: parEntiteEnriched,
      parTypologie,
      timeSeries: timeSeriesRows.map((r) => ({
        bucket: r.bucket,
        count: Number(r.cnt),
      })),
      visas: {
        parStatut: Object.fromEntries(visaByStatut.map((s) => [s.statut, s._count.id])),
        parUtilisateur: visasParUtilisateur.sort((a, b) => b.enAttente + b.vise + b.refuse - (a.enAttente + a.vise + a.refuse)),
        delaiMoyenReponseJours: delaiVisaJours,
      },
      transferts: {
        total: transfertTotal,
        topDestinations: topDestinationsTransfert,
      },
      accuses: {
        total: accuseTotal,
        parMode: Object.fromEntries(
          accuseByMode.map((m) => [m.modeEnvoi ?? '(non renseigné)', m._count.id])
        ),
      },
      topExpediteurs,
      delaiCloture: {
        moyenneJours: delaiCloture?.avgDays != null ? Number(delaiCloture.avgDays) : null,
        echantillon: delaiCloture?.n != null ? Number(delaiCloture.n) : 0,
      },
    });
  } catch (e) {
    console.error('GET /api/courrier/stats/organigramme', e);
    return apiError('Erreur lors du calcul des statistiques', 500, 'INTERNAL_ERROR');
  }
}
