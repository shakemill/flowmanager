import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';
import { canSeeCourrier } from '@/lib/courrier-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courrierId } = await params;
    const body = await request.json();
    const { action, workflowId, etapeWorkflowId, visaAction, commentaire } = body;

    if (action === 'start') {
      if (!workflowId) return apiError('workflowId requis', 400);
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: { etapes: { orderBy: { ordre: 'asc' } } },
      });
      if (!workflow) return apiError('Workflow introuvable', 404, 'NOT_FOUND');
      const firstEtape = workflow.etapes[0];
      if (!firstEtape) return apiError('Workflow sans étape', 400);
      const existing = await prisma.instanceCircuit.findFirst({
        where: { courrierId, statut: 'EN_COURS' },
      });
      if (existing) return apiError('Un circuit est déjà en cours', 400);
      const instance = await prisma.instanceCircuit.create({
        data: {
          courrierId,
          workflowId,
          etapeActuelleId: firstEtape.id,
        },
      });
      await prisma.courrier.update({
        where: { id: courrierId },
        data: { statut: 'EN_VISA' },
      });
      await logAudit('workflow_start', courrierId, { workflowId, instanceId: instance.id });
      return apiSuccess(instance, 201);
    }

    if (action === 'visa') {
      const instance = await prisma.instanceCircuit.findFirst({
        where: { courrierId, statut: 'EN_COURS' },
        include: { workflow: { include: { etapes: { orderBy: { ordre: 'asc' } } } }, etapeActuelle: true },
      });
      if (!instance) return apiError('Aucun circuit en cours', 400);
      const userId = (await getCurrentUserId()) ?? 'system';
      const etapeId = etapeWorkflowId ?? instance.etapeActuelleId;
      if (!etapeId) return apiError('Étape manquante', 400);
      const actionVal = visaAction ?? 'VISE';
      await prisma.historiqueVisa.create({
        data: {
          instanceCircuitId: instance.id,
          etapeWorkflowId: etapeId,
          userId,
          action: actionVal,
          commentaire: commentaire ?? null,
        },
      });
      const etapes = instance.workflow?.etapes ?? [];
      const currentIndex = etapes.findIndex((e) => e.id === etapeId);
      if (actionVal === 'REFUSE') {
        await prisma.instanceCircuit.update({
          where: { id: instance.id },
          data: { statut: 'ANNULE' },
        });
        await prisma.courrier.update({
          where: { id: courrierId },
          data: { statut: 'ENREGISTRE' },
        });
        await logAudit('visa_refuse', courrierId, { instanceId: instance.id, etapeId });
        return apiSuccess({ statut: 'ANNULE' });
      }
      const nextEtape = etapes[currentIndex + 1];
      if (!nextEtape) {
        await prisma.instanceCircuit.update({
          where: { id: instance.id },
          data: { statut: 'TERMINE', etapeActuelleId: null },
        });
        await prisma.courrier.update({
          where: { id: courrierId },
          data: { statut: 'VISÉ' },
        });
        await logAudit('visa_termine', courrierId, { instanceId: instance.id });
        return apiSuccess({ statut: 'TERMINE' });
      }
      await logAudit('visa_etape', courrierId, { instanceId: instance.id, etapeId, action: actionVal });
      await prisma.instanceCircuit.update({
        where: { id: instance.id },
        data: { etapeActuelleId: nextEtape.id },
      });
      return apiSuccess({ etapeActuelleId: nextEtape.id });
    }

    return apiError('Action inconnue', 400);
  } catch (e) {
    console.error('POST /api/courrier/[id]/workflow', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}

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
    const instance = await prisma.instanceCircuit.findFirst({
      where: { courrierId },
      orderBy: { createdAt: 'desc' },
      include: {
        workflow: { include: { etapes: { orderBy: { ordre: 'asc' } } } },
        etapeActuelle: true,
        historiqueVisas: { include: { user: true, etapeWorkflow: true }, orderBy: { date: 'asc' } },
      },
    });
    return apiSuccess(instance);
  } catch (e) {
    console.error('GET /api/courrier/[id]/workflow', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}
