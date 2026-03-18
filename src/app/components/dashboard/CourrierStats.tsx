'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import CardBox from '@/app/components/shared/CardBox';
import { Button } from '@/components/ui/button';

interface Stats {
  courriersAujourdhui: number;
  enAttenteVisa: number;
  parStatut: Record<string, number>;
  parPriorite: Record<string, number>;
}

export default function CourrierStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    fetch('/api/courrier/stats')
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) {
          setError(data.error);
          return;
        }
        setStats(data);
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
return (
    <CardBox className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-64 rounded bg-muted/30 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border bg-muted/20 p-5 flex flex-col gap-4">
              <div className="h-12 w-12 rounded-xl bg-muted/50 animate-pulse" />
              <div className="space-y-2">
                <div className="h-9 w-16 rounded bg-muted/50 animate-pulse" />
                <div className="h-4 w-24 rounded bg-muted/30 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </CardBox>
    );
  }

  if (error || !stats) {
    return (
      <CardBox className="p-4 mb-6">
        <p className="text-sm text-destructive">{error ?? 'Données indisponibles'}</p>
      </CardBox>
    );
  }

  const total = Object.values(stats.parStatut).reduce((a, b) => a + b, 0);

  const cards = [
    {
      value: stats.courriersAujourdhui,
      label: "Arrivés aujourd'hui",
      icon: 'solar:calendar-mark-linear',
      iconBg: 'bg-primary/15 text-primary',
    },
    {
      value: stats.enAttenteVisa,
      label: 'En attente de visa',
      icon: 'solar:clock-circle-linear',
      iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    },
    {
      value: total,
      label: 'Total courriers',
      icon: 'solar:inbox-linear',
      iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    },
    {
      value: stats.parPriorite['URGENT'] ?? 0,
      label: 'Urgents',
      icon: 'solar:flag-linear',
      iconBg: 'bg-destructive/15 text-destructive',
    },
  ];

  return (
    <CardBox className="p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3 text-foreground">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Icon icon="solar:letter-linear" className="size-6" />
            </span>
            Vue d&apos;ensemble du courrier
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5">Résumé des courriers dans votre périmètre</p>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0 w-fit">
          <Link href="/courrier">Liste complète</Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border bg-muted/15 hover:bg-muted/25 transition-colors p-5 sm:p-6 flex flex-col gap-4 min-h-[130px]"
          >
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}>
              <Icon icon={card.icon} className="size-7" />
            </div>
            <div className="min-w-0">
              <p className="text-3xl sm:text-4xl font-bold tabular-nums tracking-tight">{card.value}</p>
              <p className="text-sm font-medium text-muted-foreground mt-1">{card.label}</p>
            </div>
          </div>
        ))}
      </div>
    </CardBox>
  );
}
