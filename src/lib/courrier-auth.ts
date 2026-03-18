import { prisma } from '@/lib/prisma';

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

/**
 * Returns true if the user can act on the courrier (transfer, send for visa, send accusé de réception).
 * Aligned with "à traiter" logic: assigned to user, or in user's unit (with descendants) and not last transferred by user.
 */
export async function canActOnCourrier(courrierId: string, userId: string): Promise<boolean> {
  const courrier = await prisma.courrier.findUnique({
    where: { id: courrierId },
    select: { assignedToId: true, entiteTraitanteId: true, statut: true },
  });
  if (!courrier) return false;

  if (courrier.assignedToId !== null && String(courrier.assignedToId).trim() === String(userId).trim()) {
    return true;
  }

  const myDirectUnitIds = await prisma.userOrganisationUnit
    .findMany({
      where: { userId },
      select: { organisationUnitId: true },
    })
    .then((r) => r.map((x) => x.organisationUnitId));
  const unitIds = await getUnitIdsWithDescendants(myDirectUnitIds);

  const lastTransfer = await prisma.courrierTransfert.findFirst({
    where: { courrierId },
    orderBy: { createdAt: 'desc' },
    select: { fromUserId: true },
  });
  if (lastTransfer && String(lastTransfer.fromUserId).trim() === String(userId).trim()) {
    return false;
  }

  const statutOk = courrier.statut === 'ENREGISTRE' || courrier.statut === 'EN_TRAITEMENT';
  const assignedOk = courrier.assignedToId === null || String(courrier.assignedToId).trim() === String(userId).trim();
  const unitOk = courrier.entiteTraitanteId !== null && unitIds.includes(courrier.entiteTraitanteId);

  return unitOk && statutOk && assignedOk;
}

/**
 * Returns true if the user can see the courrier (perimeter: destinataire, recipiendaire of entite traitante, member of unit, or has a VisaDemande on this courrier).
 */
export async function canSeeCourrier(courrierId: string, userId: string): Promise<boolean> {
  const courrier = await prisma.courrier.findUnique({
    where: { id: courrierId },
    select: {
      assignedToId: true,
      entiteTraitanteId: true,
      entiteTraitante: { select: { recipiendaireId: true } },
      visaDemandes: { where: { userId }, select: { id: true }, take: 1 },
    },
  });
  if (!courrier) return false;

  if (courrier.assignedToId !== null && String(courrier.assignedToId).trim() === String(userId).trim()) {
    return true;
  }

  const recipiendaireId = courrier.entiteTraitante?.recipiendaireId;
  if (recipiendaireId != null && String(recipiendaireId).trim() === String(userId).trim()) {
    return true;
  }

  const myDirectUnitIds = await prisma.userOrganisationUnit
    .findMany({
      where: { userId },
      select: { organisationUnitId: true },
    })
    .then((r) => r.map((x) => x.organisationUnitId));
  const unitIds = await getUnitIdsWithDescendants(myDirectUnitIds);

  if (courrier.entiteTraitanteId != null && unitIds.includes(courrier.entiteTraitanteId)) {
    return true;
  }

  if (courrier.visaDemandes.length > 0) return true;

  return false;
}

/**
 * Returns a Prisma where clause for "courriers visible by this user":
 * - assigned to me, or
 * - recipiendaire of entite traitante, or
 * - entiteTraitanteId in my units (with descendants), or
 * - has a VisaDemande where I am the user (demandé pour avis) — pour que la personne sollicitée voie le courrier.
 */
export async function getCourrierVisibilityWhere(userId: string): Promise<Record<string, unknown>> {
  const myDirectUnitIds = await prisma.userOrganisationUnit
    .findMany({
      where: { userId },
      select: { organisationUnitId: true },
    })
    .then((r) => r.map((x) => x.organisationUnitId));
  const unitIds = await getUnitIdsWithDescendants(myDirectUnitIds);

  const orClauses: Record<string, unknown>[] = [{ assignedToId: userId }];
  orClauses.push({ entiteTraitante: { recipiendaireId: userId } });
  if (unitIds.length > 0) {
    orClauses.push({ entiteTraitanteId: { in: unitIds } });
  }
  orClauses.push({ visaDemandes: { some: { userId } } });

  return { OR: orClauses };
}
