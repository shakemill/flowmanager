'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import CardBox from '@/app/components/shared/CardBox';
import { cn } from '@/lib/utils';

const PRIORITE_LABELS: Record<string, string> = {
  BASSE: 'Basse',
  NORMAL: 'Normale',
  HAUTE: 'Haute',
  URGENT: 'Urgente',
};

const PRIORITE_COLORS: Record<string, string> = {
  BASSE: 'bg-muted text-muted-foreground',
  NORMAL: 'bg-primary/15 text-primary',
  HAUTE: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  URGENT: 'bg-destructive/15 text-destructive',
};

export default function CourrierPrioriteRepartition() {
  const [stats, setStats] = useState<{ parPriorite: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/courrier/stats')
      .then((r) => r.json())
      .then((data) => {
        if (!data?.error && data?.parPriorite) setStats({ parPriorite: data.parPriorite });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <CardBox className="p-6">
        <h5 className="card-title mb-4 flex items-center gap-2">
          <Icon icon="solar:flag-linear" className="size-5" />
          Par priorité
        </h5>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />
          ))}
        </div>
      </CardBox>
    );
  }

  if (!stats?.parPriorite) return null;

  const order: (keyof typeof PRIORITE_LABELS)[] = ['URGENT', 'HAUTE', 'NORMAL', 'BASSE'];
  const total = order.reduce((acc, k) => acc + (stats.parPriorite[k] ?? 0), 0);

  return (
    <CardBox className="p-5 sm:p-6 h-full min-h-0 flex flex-col">
      <div className="mb-3 sm:mb-4">
        <h5 className="card-title flex items-center gap-2">
          <Icon icon="solar:flag-linear" className="size-5 text-primary" />
          Par priorité
        </h5>
        <p className="text-xs text-muted-foreground mt-1">{total} courrier{total !== 1 ? 's' : ''}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
        {order.map((key) => {
          const count = stats.parPriorite[key] ?? 0;
          return (
            <div
              key={key}
              className={cn(
                'rounded-lg border px-3 py-2.5 text-center',
                PRIORITE_COLORS[key] ?? 'bg-muted/30'
              )}
            >
              <p className="text-xl font-bold tabular-nums">{count}</p>
              <p className="text-xs font-medium">{PRIORITE_LABELS[key] ?? key}</p>
            </div>
          );
        })}
      </div>
    </CardBox>
  );
}
