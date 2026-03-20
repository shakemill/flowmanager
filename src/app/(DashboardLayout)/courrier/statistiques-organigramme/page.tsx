'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import BreadcrumbComp from '@/app/(DashboardLayout)/layout/shared/breadcrumb/BreadcrumbComp';
import CardBox from '@/app/components/shared/CardBox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

const BCrumb = [
  { to: '/', title: 'Accueil' },
  { to: '/courrier', title: 'Courrier' },
  { title: 'Statistiques périmètre' },
];

const STATUT_LABELS: Record<string, string> = {
  ENREGISTRE: 'Enregistré',
  EN_TRAITEMENT: 'En traitement',
  EN_VISA: 'En visa',
  VISÉ: 'Visé',
  CLOTURE: 'Clôturé',
  ANNULE: 'Annulé',
};

const PRIORITE_LABELS: Record<string, string> = {
  BASSE: 'Basse',
  NORMAL: 'Normale',
  HAUTE: 'Haute',
  URGENT: 'Urgent',
};

const VISA_STATUT_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  VISE: 'Visé',
  REFUSE: 'Refusé',
};

type OrganigrammeStats = {
  period: { from: string; to: string };
  perimeter: { rootUnitIds: string[]; unitCount: number };
  totals: { total: number; courriersAujourdhui: number; assigned: number; unassigned: number };
  parStatut: Record<string, number>;
  parPriorite: Record<string, number>;
  parEntite: Array<{ unitId: string; libelle: string; path: string; count: number }>;
  parTypologie: Array<{
    typologieId: string | null;
    libelle: string;
    parentLibelle: string | null;
    count: number;
  }>;
  timeSeries: Array<{ bucket: string; count: number }>;
  visas: {
    parStatut: Record<string, number>;
    parUtilisateur: Array<{
      userId: string;
      name: string | null;
      email: string;
      enAttente: number;
      vise: number;
      refuse: number;
    }>;
    delaiMoyenReponseJours: number | null;
  };
  transferts: {
    total: number;
    topDestinations: Array<{ unitId: string | null; libelle: string; count: number }>;
  };
  accuses: { total: number; parMode: Record<string, number> };
  topExpediteurs: Array<{ contactId: string; nom: string; count: number }>;
  delaiCloture: { moyenneJours: number | null; echantillon: number };
};

export default function StatistiquesOrganigrammePage() {
  const defaultTo = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const defaultFrom = useMemo(() => format(subMonths(new Date(), 12), 'yyyy-MM-dd'), []);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [stats, setStats] = useState<OrganigrammeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const q = new URLSearchParams({ from, to });
      const res = await fetch(`/api/courrier/stats/organigramme?${q}`, { credentials: 'include' });
      const data = await res.json();
      if (res.status === 403) {
        setForbidden(true);
        setStats(null);
        return;
      }
      if (!res.ok || data.error) {
        toast.error(data?.error ?? 'Erreur de chargement');
        setStats(null);
        return;
      }
      setStats(data as OrganigrammeStats);
    } catch {
      toast.error('Erreur réseau');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const listCourrierHref = (unitId: string) => {
    const q = new URLSearchParams({ entiteId: unitId, dateDebut: from, dateFin: to });
    return `/courrier?${q.toString()}`;
  };

  const listCourrierGlobalHref = `/courrier?dateDebut=${encodeURIComponent(from)}&dateFin=${encodeURIComponent(to)}`;

  if (forbidden) {
    return (
      <>
        <BreadcrumbComp title="Statistiques périmètre" items={BCrumb} />
        <CardBox className="mt-6 p-8 text-center max-w-lg mx-auto">
          <Icon icon="solar:shield-warning-linear" className="size-12 mx-auto text-amber-500 mb-4" />
          <h1 className="text-lg font-semibold mb-2">Accès réservé</h1>
          <p className="text-sm text-muted-foreground">
            Cette page est réservée aux responsables désignés comme{' '}
            <strong>récipiendaire</strong> sur au moins une unité de l&apos;organigramme. Contactez un
            administrateur pour vous affecter sur une entité dans{' '}
            <Link href="/courrier/organigramme" className="text-primary underline">
              Organigramme
            </Link>
            .
          </p>
        </CardBox>
      </>
    );
  }

  return (
    <>
      <BreadcrumbComp title="Statistiques périmètre" items={BCrumb} />
      <div className="mt-4 space-y-2 max-w-[1600px]">
        <p className="text-sm text-muted-foreground">
          Indicateurs sur le courrier des entités dont vous êtes le récipiendaire (et leurs services
          rattachés), filtré par <strong>date d&apos;arrivée</strong>.
        </p>
        <CardBox className="p-4 flex flex-wrap items-end gap-4">
          <div>
            <Label htmlFor="stats-from">Du</Label>
            <Input
              id="stats-from"
              type="date"
              className="mt-1 w-40"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="stats-to">Au</Label>
            <Input
              id="stats-to"
              type="date"
              className="mt-1 w-40"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button type="button" onClick={load} disabled={loading}>
            {loading ? 'Chargement…' : 'Actualiser'}
          </Button>
          {stats && (
            <p className="text-xs text-muted-foreground ml-auto">
              Périmètre : {stats.perimeter.unitCount} unité{stats.perimeter.unitCount > 1 ? 's' : ''} ·{' '}
              {format(new Date(stats.period.from), 'dd MMM yyyy', { locale: fr })} —{' '}
              {format(new Date(stats.period.to), 'dd MMM yyyy', { locale: fr })}
            </p>
          )}
        </CardBox>
      </div>

      {loading && !stats ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <CardBox key={i} className="p-6 h-28 animate-pulse bg-muted/20">
              {' '}
            </CardBox>
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <CardBox className="p-5 border-l-4 border-l-primary">
              <p className="text-xs font-medium text-muted-foreground uppercase">Courriers (période)</p>
              <p className="text-3xl font-bold tabular-nums mt-1">{stats.totals.total}</p>
              <Link href={listCourrierGlobalHref} className="text-xs text-primary mt-2 inline-block">
                Voir la liste filtrée →
              </Link>
            </CardBox>
            <CardBox className="p-5 border-l-4 border-l-blue-500">
              <p className="text-xs font-medium text-muted-foreground uppercase">Arrivées aujourd&apos;hui</p>
              <p className="text-3xl font-bold tabular-nums mt-1">{stats.totals.courriersAujourdhui}</p>
            </CardBox>
            <CardBox className="p-5 border-l-4 border-l-amber-500">
              <p className="text-xs font-medium text-muted-foreground uppercase">Affectés / non affectés</p>
              <p className="text-2xl font-bold tabular-nums mt-1">
                {stats.totals.assigned} <span className="text-muted-foreground text-lg font-normal">/</span>{' '}
                {stats.totals.unassigned}
              </p>
            </CardBox>
            <CardBox className="p-5 border-l-4 border-l-green-600">
              <p className="text-xs font-medium text-muted-foreground uppercase">Délai moyen clôture / visé</p>
              <p className="text-3xl font-bold tabular-nums mt-1">
                {stats.delaiCloture.moyenneJours != null
                  ? `${stats.delaiCloture.moyenneJours.toFixed(1)} j`
                  : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                n = {stats.delaiCloture.echantillon} (DATEDIFF fin − arrivée)
              </p>
            </CardBox>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <CardBox className="p-6">
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Icon icon="solar:pie-chart-2-linear" className="size-5" />
                Répartition par statut
              </h2>
              <BarBreakdown
                entries={Object.entries(stats.parStatut)}
                labelKey={STATUT_LABELS}
                total={stats.totals.total}
              />
            </CardBox>
            <CardBox className="p-6">
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Icon icon="solar:flag-linear" className="size-5" />
                Répartition par priorité
              </h2>
              <BarBreakdown
                entries={Object.entries(stats.parPriorite)}
                labelKey={PRIORITE_LABELS}
                total={stats.totals.total}
              />
            </CardBox>
          </div>

          <CardBox className="p-6 mt-6">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Icon icon="solar:calendar-linear" className="size-5" />
              Arrivées par mois (date d&apos;arrivée)
            </h2>
            {stats.timeSeries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée.</p>
            ) : (
              <div className="flex flex-wrap items-end gap-2 h-40">
                {(() => {
                  const max = Math.max(...stats.timeSeries.map((t) => t.count), 1);
                  return stats.timeSeries.map((t) => (
                    <div key={t.bucket} className="flex flex-col items-center gap-1 min-w-[2.5rem]">
                      <div
                        className="w-full min-h-[4px] rounded-t bg-primary/80"
                        style={{ height: `${Math.max(8, (t.count / max) * 120)}px` }}
                        title={`${t.bucket}: ${t.count}`}
                      />
                      <span className="text-[10px] text-muted-foreground -rotate-45 origin-top-left whitespace-nowrap">
                        {t.bucket}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            )}
          </CardBox>

          <CardBox className="p-6 mt-6 overflow-x-auto">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Icon icon="solar:buildings-2-linear" className="size-5" />
              Détail par entité traitante
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hiérarchie</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.parEntite.map((row) => (
                  <TableRow key={row.unitId}>
                    <TableCell>
                      <p className="font-medium">{row.libelle}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-md" title={row.path}>
                        {row.path}
                      </p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                    <TableCell>
                      <Link
                        href={listCourrierHref(row.unitId)}
                        className="text-xs text-primary whitespace-nowrap">
                        Liste →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBox>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <CardBox className="p-6 overflow-x-auto">
              <h2 className="text-base font-semibold mb-4">Typologies</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Typologie</TableHead>
                    <TableHead>Niveau parent</TableHead>
                    <TableHead className="text-right">N</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.parTypologie.map((row, i) => (
                    <TableRow key={`${row.typologieId ?? 'none'}-${i}`}>
                      <TableCell>{row.libelle}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {row.parentLibelle ?? '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBox>
            <CardBox className="p-6">
              <h2 className="text-base font-semibold mb-4">Visas</h2>
              <BarBreakdown
                entries={Object.entries(stats.visas.parStatut)}
                labelKey={VISA_STATUT_LABELS}
                total={Object.values(stats.visas.parStatut).reduce((a, b) => a + b, 0)}
              />
              {stats.visas.delaiMoyenReponseJours != null && (
                <p className="text-sm text-muted-foreground mt-4">
                  Délai moyen de réponse (demande → réponse) :{' '}
                  <strong>{stats.visas.delaiMoyenReponseJours.toFixed(1)} jours</strong>
                </p>
              )}
              {stats.visas.parUtilisateur.length > 0 && (
                <Table className="mt-4">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Signataire / avis</TableHead>
                      <TableHead className="text-right">Att.</TableHead>
                      <TableHead className="text-right">Visé</TableHead>
                      <TableHead className="text-right">Ref.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.visas.parUtilisateur.slice(0, 20).map((u) => (
                      <TableRow key={u.userId}>
                        <TableCell className="text-sm">
                          {u.name ?? u.email}
                          {u.name && (
                            <span className="block text-xs text-muted-foreground">{u.email}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{u.enAttente}</TableCell>
                        <TableCell className="text-right tabular-nums">{u.vise}</TableCell>
                        <TableCell className="text-right tabular-nums">{u.refuse}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardBox>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <CardBox className="p-6 overflow-x-auto">
              <h2 className="text-base font-semibold mb-4">
                Transferts (volume : {stats.transferts.total})
              </h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unité destination</TableHead>
                    <TableHead className="text-right">Nombre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.transferts.topDestinations.map((row) => (
                    <TableRow key={row.unitId ?? 'null'}>
                      <TableCell>{row.libelle}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBox>
            <CardBox className="p-6 overflow-x-auto">
              <h2 className="text-base font-semibold mb-4">
                Accusés de réception (total : {stats.accuses.total})
              </h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mode d&apos;envoi</TableHead>
                    <TableHead className="text-right">Nombre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(stats.accuses.parMode).map(([mode, n]) => (
                    <TableRow key={mode}>
                      <TableCell>{mode}</TableCell>
                      <TableCell className="text-right tabular-nums">{n}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBox>
          </div>

          <CardBox className="p-6 mt-6 overflow-x-auto">
            <h2 className="text-base font-semibold mb-4">Top expéditeurs</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Courriers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topExpediteurs.map((row) => (
                  <TableRow key={row.contactId}>
                    <TableCell>{row.nom}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBox>
        </>
      ) : null}
    </>
  );
}

function BarBreakdown({
  entries,
  labelKey,
  total,
}: {
  entries: [string, number][];
  labelKey: Record<string, string>;
  total: number;
}) {
  const filtered = entries.filter(([, n]) => n > 0);
  if (filtered.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune donnée.</p>;
  }
  return (
    <div className="space-y-3">
      {filtered.map(([key, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{labelKey[key] ?? key}</span>
              <span className="tabular-nums text-muted-foreground">
                {count} ({pct}%)
              </span>
            </div>
            <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
              <div
                className={cn('h-full rounded-full bg-primary/80 transition-all')}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
