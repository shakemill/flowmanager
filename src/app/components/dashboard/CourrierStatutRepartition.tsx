'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import CardBox from '@/app/components/shared/CardBox';
import { cn } from '@/lib/utils';

const STATUT_LABELS: Record<string, string> = {
  ENREGISTRE: 'Enregistré',
  EN_TRAITEMENT: 'En traitement',
  EN_VISA: 'En visa',
  VISÉ: 'Visé',
  CLOTURE: 'Clôturé',
  ANNULE: 'Annulé',
};

const STATUT_COLORS: Record<string, string> = {
  ENREGISTRE: 'bg-slate-500/80',
  EN_TRAITEMENT: 'bg-blue-500/80',
  EN_VISA: 'bg-amber-500/80',
  VISÉ: 'bg-cyan-500/80',
  CLOTURE: 'bg-green-500/80',
  ANNULE: 'bg-muted',
};

export default function CourrierStatutRepartition() {
  const [stats, setStats] = useState<{ parStatut: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/courrier/stats')
      .then((r) => r.json())
      .then((data) => {
        if (!data?.error && data?.parStatut) setStats({ parStatut: data.parStatut });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <CardBox className="p-6 min-h-[280px] flex flex-col">
        <h5 className="card-title mb-4 flex items-center gap-2">
          <Icon icon="solar:pie-chart-2-linear" className="size-5" />
          Répartition par statut
        </h5>
        <div className="space-y-3 flex-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 rounded bg-muted/30 animate-pulse" />
          ))}
        </div>
      </CardBox>
    );
  }

  if (!stats?.parStatut) return null;

  const total = Object.values(stats.parStatut).reduce((a, b) => a + b, 0);
  const entries = Object.entries(stats.parStatut).filter(([, n]) => n > 0);

  if (total === 0) {
    return (
      <CardBox className="p-6 min-h-[280px] flex flex-col">
        <h5 className="card-title mb-4 flex items-center gap-2">
          <Icon icon="solar:pie-chart-2-linear" className="size-5" />
          Répartition par statut
        </h5>
        <p className="text-sm text-muted-foreground">Aucun courrier.</p>
      </CardBox>
    );
  }

  return (
    <CardBox className="p-6 h-full min-h-[280px] flex flex-col">
      <div className="mb-4">
        <h5 className="card-title flex items-center gap-2">
          <Icon icon="solar:pie-chart-2-linear" className="size-5 text-primary" />
          Répartition par statut
        </h5>
        <p className="text-xs text-muted-foreground mt-1">{total} courrier{total !== 1 ? 's' : ''} au total</p>
      </div>
      <div className="space-y-3 flex-1 min-h-0">
        {entries.map(([statut, count]) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={statut} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{STATUT_LABELS[statut] ?? statut}</span>
                <span className="tabular-nums text-muted-foreground">
                  {count} ({pct} %)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all', STATUT_COLORS[statut] ?? 'bg-muted')}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </CardBox>
  );
}
