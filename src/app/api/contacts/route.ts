import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const contacts = await prisma.contact.findMany({
      where: q ? { nom: { contains: q } } : undefined,
      take: 50,
      orderBy: { nom: 'asc' },
    });
    return apiSuccess(contacts);
  } catch (e) {
    console.error('GET /api/contacts', e);
    return apiError('Erreur lors de la récupération des contacts', 500, 'INTERNAL_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nom, type, email, telephone, adresse, raisonSociale } = body;
    if (!nom || typeof nom !== 'string') {
      return apiError('Nom requis', 400);
    }
    const contact = await prisma.contact.create({
      data: {
        nom: nom.trim(),
        type: type ?? 'PERSONNE',
        raisonSociale: type === 'SOCIETE' && raisonSociale && typeof raisonSociale === 'string' ? raisonSociale.trim() || null : null,
        email: email ?? null,
        telephone: telephone ?? null,
        adresse: adresse ?? null,
      },
    });
    return apiSuccess(contact, 201);
  } catch (e) {
    console.error('POST /api/contacts', e);
    return apiError('Erreur lors de la création du contact', 500, 'INTERNAL_ERROR');
  }
}
