'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import CardBox from '@/app/components/shared/CardBox';

const BANETTE_LABELS: Record<string, string> = {
  a_traiter: 'À traiter',
  mon_service: 'Courrier de mon service',
  en_attente_mes_avis: 'En attente de mes avis',
  transferes_a_moi: 'Transférés à moi',
  en_attente_avis: 'En attente des avis (tous)',
  retour_avis: 'Retour des avis',
  archives: 'Archivés',
};

const BANETTE_ICONS: Record<string, string> = {
  a_traiter: 'solar:inbox-linear',
  mon_service: 'solar:buildings-2-linear',
  en_attente_mes_avis: 'solar:clock-circle-linear',
  transferes_a_moi: 'solar:user-check-linear',
  en_attente_avis: 'solar:clock-circle-linear',
  retour_avis: 'solar:check-circle-linear',
  archives: 'solar:archive-linear',
};

export default function MesBanettesResume() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/courrier/counts')
      .then((r) => r.json())
      .then((data) => {
        if (!data?.error && typeof data === 'object') setCounts(data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <CardBox className="p-6">
        <h5 className="card-title mb-5 flex items-center gap-2">
          <Icon icon="solar:inbox-linear" className="size-5" />
          Mes banettes
        </h5>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-muted/30 animate-pulse" />
          ))}
        </div>
      </CardBox>
    );
  }

  if (!counts) return null;

  const entries = Object.entries(BANETTE_LABELS);

  return (
    <CardBox className="p-5 sm:p-6 h-full min-h-0 flex flex-col">
      <div className="mb-3 sm:mb-4">
        <h5 className="card-title flex items-center gap-2">
          <Icon icon="solar:inbox-linear" className="size-5 text-primary" />
          Mes banettes
        </h5>
        <p className="text-xs text-muted-foreground mt-1">Accès direct par vue</p>
      </div>
      <div className="space-y-1.5 sm:space-y-2 flex-1 min-h-0 overflow-auto">
        {entries.map(([viewKey, label]) => {
          const count = counts[viewKey] ?? 0;
          return (
            <Link
              key={viewKey}
              href={`/courrier/mes-banettes?view=${viewKey}`}
              className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5 sm:py-3 transition-colors hover:bg-muted/40 hover:border-primary/30"
            >
              <span className="flex items-center gap-2.5 text-sm font-medium">
                <Icon icon={BANETTE_ICONS[viewKey] ?? 'solar:inbox-linear'} className="size-4 text-muted-foreground shrink-0" />
                {label}
              </span>
              <span className="text-sm font-bold tabular-nums text-primary shrink-0">{count}</span>
            </Link>
          );
        })}
      </div>
      <Link
        href="/courrier/mes-banettes"
        className="mt-4 block text-center text-sm font-medium text-primary hover:underline py-1"
      >
        Voir mes banettes
      </Link>
    </CardBox>
  );
}
