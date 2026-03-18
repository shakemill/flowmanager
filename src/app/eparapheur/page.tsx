'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import CardBox from '@/app/components/shared/CardBox';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EparapheurEnvoiRow {
  id: string;
  statut: string;
  createdAt: string;
  courrier: { id: string; numero: string; objet: string };
  envoyeur: { id: string; name: string | null; email: string };
  documents: { id: string; estPrincipal: boolean; ordre: number; pieceJointe: { id: string; nomFichier: string; cheminStockage: string } | null }[];
}

export default function EparapheurPage() {
  const [envois, setEnvois] = useState<EparapheurEnvoiRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/eparapheur/envois')
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        setEnvois(Array.isArray(data) ? data : []);
      })
      .catch(() => setEnvois([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 max-w-4xl mx-auto overflow-auto touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="flex items-center justify-center size-12 rounded-xl bg-primary/15 text-primary">
            <Icon icon="solar:tablet-linear" className="size-7" />
          </span>
          <h1 className="text-2xl font-bold text-foreground">Éparapheur</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Documents en attente de signature ou d&apos;annotations. Ouvrez un envoi pour le traiter sur la tablette.
        </p>
      </header>

      {loading ? (
        <CardBox className="p-8 text-center">
          <p className="text-muted-foreground">Chargement des envois…</p>
        </CardBox>
      ) : envois.length === 0 ? (
        <CardBox className="p-8 text-center">
          <Icon icon="solar:inbox-linear" className="size-14 mx-auto text-muted-foreground/50 mb-4" />
          <p className="font-medium text-foreground">Aucun document en attente</p>
          <p className="text-sm text-muted-foreground mt-1">
            Les envois à l&apos;éparapheur apparaîtront ici lorsqu&apos;un collaborateur enverra un courrier depuis la fiche courrier.
          </p>
        </CardBox>
      ) : (
        <ul className="space-y-3">
          {envois.map((envoi) => (
            <li key={envoi.id}>
              <Link href={`/eparapheur/${envoi.id}`}>
                <CardBox className="p-4 sm:p-5 hover:bg-muted/20 transition-colors cursor-pointer block">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {envoi.courrier.numero} — {envoi.courrier.objet}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Envoyé par {envoi.envoyeur.name || envoi.envoyeur.email} le{' '}
                        {format(new Date(envoi.createdAt), 'd MMMM yyyy à HH:mm', { locale: fr })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {envoi.documents.length} document(s)
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0 gap-2">
                      <Icon icon="solar:pen-2-linear" className="size-4" />
                      Traiter
                    </Button>
                  </div>
                </CardBox>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <Link href="/" className="text-sm font-medium text-primary hover:underline">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
