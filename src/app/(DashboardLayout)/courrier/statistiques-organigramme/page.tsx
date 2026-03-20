'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { format, subMonths, subDays, startOfYear, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import BreadcrumbComp from '@/app/(DashboardLayout)/layout/shared/breadcrumb/BreadcrumbComp';
import CardBox from '@/app/components/shared/CardBox';
import { Badge } from '@/components/ui/badge';
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

type ParEntiteStatsRow = {
  unitId: string;
  libelle: string;
  parentId: string | null;
  niveau: number;
  ordre: number;
  entiteTraitante: boolean;
  path: string;
  pathFull: string;
  count: number;
};

type EntiteStatsTreeNode = ParEntiteStatsRow & { children: EntiteStatsTreeNode[] };

function buildEntiteStatsTree(rows: ParEntiteStatsRow[]): EntiteStatsTreeNode[] {
  const byId = new Map<string, EntiteStatsTreeNode>();
  const inPerimeter = new Set(rows.map((r) => r.unitId));
  for (const r of rows) {
    byId.set(r.unitId, { ...r, children: [] });
  }
  const roots: EntiteStatsTreeNode[] = [];
  for (const r of rows) {
    const node = byId.get(r.unitId)!;
    const p = r.parentId;
    if (p && inPerimeter.has(p) && byId.has(p)) {
      byId.get(p)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  function sortRecursive(nodes: EntiteStatsTreeNode[]) {
    nodes.sort((a, b) => {
      if (a.ordre !== b.ordre) return a.ordre - b.ordre;
      return a.libelle.localeCompare(b.libelle, 'fr', { sensitivity: 'base' });
    });
    for (const n of nodes) sortRecursive(n.children);
  }
  sortRecursive(roots);
  return roots;
}

/** Ordre DFS (parent puis enfants) pour alterner les bandes comme un tableau. */
function buildEntiteRowStripeMap(forest: EntiteStatsTreeNode[]): Map<string, number> {
  const m = new Map<string, number>();
  let i = 0;
  function walk(n: EntiteStatsTreeNode) {
    m.set(n.unitId, i++);
    for (const c of n.children) walk(c);
  }
  for (const root of forest) walk(root);
  return m;
}

function EntiteStatsTreeNode({
  node,
  listCourrierHref,
  rowStripeMap,
}: {
  node: EntiteStatsTreeNode;
  listCourrierHref: (unitId: string) => string;
  rowStripeMap: Map<string, number>;
}) {
  /** Replié par défaut : déplier niveau par niveau avec + / − (comme l’organigramme). */
  const [branchOpen, setBranchOpen] = useState(false);
  const hasChildren = node.children.length > 0;
  const stripeIdx = rowStripeMap.get(node.unitId) ?? 0;
  const isStripedEven = stripeIdx % 2 === 0;

  return (
    <div className="pl-4 border-l border-muted">
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-2 gap-y-1 py-2 px-2.5 -mx-0.5 rounded-lg border transition-colors group',
          'shadow-sm',
          isStripedEven
            ? 'bg-muted/50 border-border/50 hover:bg-muted/65 dark:bg-muted/35 dark:hover:bg-muted/50'
            : 'bg-background/90 border-border/40 hover:bg-muted/35 dark:bg-background/40 dark:hover:bg-muted/25'
        )}>
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setBranchOpen((o) => !o)}
            className="p-0.5 shrink-0 rounded-md hover:bg-background/60 dark:hover:bg-background/20"
            aria-expanded={branchOpen}>
            <Icon
              icon={branchOpen ? 'solar:minus-circle-linear' : 'solar:add-circle-linear'}
              className="size-4"
            />
          </button>
        ) : (
          <span className="w-5 shrink-0 inline-block" aria-hidden />
        )}
        <span className="font-medium text-foreground">{node.libelle}</span>
        <span className="text-xs text-muted-foreground">(niveau {node.niveau})</span>
        {node.entiteTraitante ? (
          <span title="Affichée comme entité traitante à l&apos;enregistrement du courrier">
            <Icon icon="solar:document-text-linear" className="size-4 text-muted-foreground shrink-0" />
          </span>
        ) : null}
        <span
          title="Volume sur la période (date d&apos;arrivée)"
          className={cn(
            'ml-auto tabular-nums text-sm font-semibold shrink-0 min-w-[2rem] text-right',
            node.count === 0 && 'text-muted-foreground font-normal'
          )}>
          {node.count}
        </span>
        <Button variant="ghost" size="sm" className="h-7 rounded-lg text-primary shrink-0 px-2" asChild>
          <Link href={listCourrierHref(node.unitId)}>Liste</Link>
        </Button>
      </div>
      {branchOpen && hasChildren ? (
        <div className="space-y-1.5 mt-1.5">
          {node.children.map((child) => (
            <EntiteStatsTreeNode
              key={child.unitId}
              node={child}
              listCourrierHref={listCourrierHref}
              rowStripeMap={rowStripeMap}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const STATUT_LABELS: Record<string, string> = {
  ENREGISTRE: 'Enregistré',
  EN_TRAITEMENT: 'En traitement',
  EN_VISA: 'En visa',
  VISÉ: 'Visé',
  CLOTURE: 'Clôturé',
  ANNULE: 'Annulé',
};

const STATUT_BAR_COLORS: Record<string, string> = {
  ENREGISTRE: 'bg-slate-500 dark:bg-slate-400',
  EN_TRAITEMENT: 'bg-blue-500',
  EN_VISA: 'bg-amber-500',
  VISÉ: 'bg-cyan-500',
  CLOTURE: 'bg-emerald-500',
  ANNULE: 'bg-muted-foreground/50',
};

const PRIORITE_LABELS: Record<string, string> = {
  BASSE: 'Basse',
  NORMAL: 'Normale',
  HAUTE: 'Haute',
  URGENT: 'Urgent',
};

const PRIORITE_BAR_COLORS: Record<string, string> = {
  BASSE: 'bg-muted-foreground/60',
  NORMAL: 'bg-primary',
  HAUTE: 'bg-orange-500',
  URGENT: 'bg-destructive',
};

const VISA_STATUT_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  VISE: 'Vis accordé',
  REFUSE: 'Refusé',
};

const VISA_BAR_COLORS: Record<string, string> = {
  EN_ATTENTE: 'bg-amber-500',
  VISE: 'bg-emerald-500',
  REFUSE: 'bg-destructive',
};

type OrganigrammeStats = {
  period: { from: string; to: string };
  perimeter: { rootUnitIds: string[]; unitCount: number; scope?: 'admin' | 'recipiendaire' };
  totals: { total: number; courriersAujourdhui: number; assigned: number; unassigned: number };
  parStatut: Record<string, number>;
  parPriorite: Record<string, number>;
  parEntite: ParEntiteStatsRow[];
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

function SectionTitle({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon icon={icon} className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? (
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function StatCard({
  value,
  label,
  sub,
  icon,
  iconClassName,
  href,
  hrefLabel,
}: {
  value: React.ReactNode;
  label: string;
  sub?: string;
  icon: string;
  iconClassName: string;
  href?: string;
  hrefLabel?: string;
}) {
  const inner = (
    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-muted/40 via-background to-background p-5 sm:p-6 shadow-sm hover:border-primary/25 hover:shadow-md transition-all duration-200 h-full flex flex-col gap-4 min-h-[148px]">
      <div
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg',
          iconClassName
        )}>
        <Icon icon={icon} className="size-6" />
      </div>
      <div className="min-w-0 mt-auto">
        <p className="text-3xl sm:text-4xl font-bold tabular-nums tracking-tight text-foreground">
          {value}
        </p>
        <p className="text-sm font-medium text-muted-foreground mt-1">{label}</p>
        {sub ? <p className="text-xs text-muted-foreground/90 mt-1.5 leading-snug">{sub}</p> : null}
        {href && hrefLabel ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-3 hover:underline">
            {hrefLabel}
            <Icon icon="solar:arrow-right-linear" className="size-3.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
  return inner;
}

function BarBreakdown({
  entries,
  labelKey,
  total,
  colorMap,
}: {
  entries: [string, number][];
  labelKey: Record<string, string>;
  total: number;
  colorMap: Record<string, string>;
}) {
  const filtered = entries.filter(([, n]) => n > 0);
  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-border bg-muted/20">
        <Icon icon="solar:chart-2-linear" className="size-10 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">Aucune donnée sur cette période</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {filtered.map(([key, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const barColor = colorMap[key] ?? 'bg-primary';
        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">{labelKey[key] ?? key}</span>
              <span className="tabular-nums text-muted-foreground shrink-0">
                <span className="font-semibold text-foreground">{count}</span>
                <span className="mx-1 text-border">·</span>
                {pct}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/50">
              <div
                className={cn('h-full rounded-full transition-all duration-500 ease-out', barColor)}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DataTableShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/60 overflow-hidden bg-card shadow-sm',
        className
      )}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export default function StatistiquesOrganigrammePage() {
  const defaultTo = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const defaultFrom = useMemo(() => format(subMonths(new Date(), 12), 'yyyy-MM-dd'), []);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [stats, setStats] = useState<OrganigrammeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const applyPreset = useCallback(
    (preset: 'yesterday' | 'week' | '30d' | '12m' | 'ytd') => {
      const today = new Date();
      if (preset === 'yesterday') {
        const y = subDays(today, 1);
        const d = format(y, 'yyyy-MM-dd');
        setFrom(d);
        setTo(d);
        return;
      }
      if (preset === 'week') {
        const start = startOfWeek(today, { locale: fr });
        const end = endOfWeek(today, { locale: fr });
        setFrom(format(start, 'yyyy-MM-dd'));
        setTo(format(end, 'yyyy-MM-dd'));
        return;
      }
      const end = today;
      let start: Date;
      if (preset === '30d') {
        start = new Date(end);
        start.setDate(start.getDate() - 30);
      } else if (preset === 'ytd') {
        start = startOfYear(end);
      } else {
        start = subMonths(end, 12);
      }
      setFrom(format(start, 'yyyy-MM-dd'));
      setTo(format(end, 'yyyy-MM-dd'));
    },
    []
  );

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

  const entiteForest = useMemo(
    () => (stats ? buildEntiteStatsTree(stats.parEntite) : []),
    [stats]
  );

  const entiteRowStripeMap = useMemo(() => buildEntiteRowStripeMap(entiteForest), [entiteForest]);

  if (forbidden) {
    return (
      <>
        <BreadcrumbComp title="Statistiques périmètre" items={BCrumb} />
        <div className="mt-8 flex justify-center px-4">
          <CardBox className="relative max-w-md w-full overflow-hidden border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-background p-0 shadow-lg">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500" />
            <div className="p-8 text-center pt-10">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 mb-5 ring-1 ring-amber-500/25">
                <Icon icon="solar:shield-warning-linear" className="size-7" />
              </span>
              <h1 className="text-xl font-semibold tracking-tight">Accès réservé</h1>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                Réservé aux <strong className="text-foreground">administrateurs</strong> ou aux
                utilisateurs désignés comme{' '}
                <strong className="text-foreground">récipiendaire</strong> sur une unité dans{' '}
                <Link href="/courrier/organigramme" className="text-primary font-medium hover:underline">
                  Organigramme
                </Link>
                .
              </p>
            </div>
          </CardBox>
        </div>
      </>
    );
  }

  return (
    <>
      <BreadcrumbComp title="Statistiques périmètre" items={BCrumb} />
      <div className="mt-6 space-y-8 max-w-[1600px]">
        {/* En-tête */}
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
                <Icon icon="solar:chart-square-bold" className="size-6" />
              </span>
              {stats?.perimeter?.scope === 'admin' ? (
                <Badge variant="lightPrimary" className="rounded-full px-3">
                  Vue globale
                </Badge>
              ) : stats ? (
                <Badge variant="outline" className="rounded-full px-3 border-primary/30 text-primary">
                  Périmètre récipiendaire
                </Badge>
              ) : null}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Statistiques du courrier
              </h1>
              <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base leading-relaxed">
                Pilotez les volumes, délais et répartitions sur votre périmètre. Les filtres
                s&apos;appliquent à la <strong className="text-foreground">date d&apos;arrivée</strong>{' '}
                des courriers.
              </p>
            </div>
          </div>
        </header>

        {/* Filtres */}
        <CardBox className="p-5 sm:p-6 rounded-2xl border-border/70 shadow-sm bg-card/50 backdrop-blur-sm">
          <div className="flex flex-col xl:flex-row xl:items-end gap-6">
            <div className="flex flex-wrap items-end gap-4 flex-1">
              <div className="space-y-2">
                <Label htmlFor="stats-from" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Du
                </Label>
                <Input
                  id="stats-from"
                  type="date"
                  className="w-40 rounded-lg border-border/80 h-10"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stats-to" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Au
                </Label>
                <Input
                  id="stats-to"
                  type="date"
                  className="w-40 rounded-lg border-border/80 h-10"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <Button type="button" onClick={load} disabled={loading} className="h-10 rounded-lg gap-2">
                <Icon
                  icon={loading ? 'solar:refresh-linear' : 'solar:refresh-bold'}
                  className={cn('size-4', loading && 'animate-spin')}
                />
                {loading ? 'Actualisation…' : 'Actualiser'}
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Raccourcis
              </span>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" className="rounded-lg h-9" onClick={() => applyPreset('yesterday')}>
                  Hier
                </Button>
                <Button type="button" variant="outline" size="sm" className="rounded-lg h-9" onClick={() => applyPreset('week')}>
                  Cette semaine
                </Button>
                <Button type="button" variant="outline" size="sm" className="rounded-lg h-9" onClick={() => applyPreset('30d')}>
                  30 jours
                </Button>
                <Button type="button" variant="outline" size="sm" className="rounded-lg h-9" onClick={() => applyPreset('12m')}>
                  12 mois
                </Button>
                <Button type="button" variant="outline" size="sm" className="rounded-lg h-9" onClick={() => applyPreset('ytd')}>
                  Année en cours
                </Button>
              </div>
            </div>
            {stats ? (
              <div className="xl:text-right text-sm text-muted-foreground xl:border-l xl:border-border/60 xl:pl-6 xl:min-w-[200px]">
                <p className="font-medium text-foreground">
                  {stats.perimeter.unitCount} unité{stats.perimeter.unitCount > 1 ? 's' : ''}
                </p>
                <p className="text-xs mt-1">
                  {format(new Date(stats.period.from), 'd MMM yyyy', { locale: fr })} —{' '}
                  {format(new Date(stats.period.to), 'd MMM yyyy', { locale: fr })}
                </p>
              </div>
            ) : null}
          </div>
        </CardBox>
      </div>

      {loading && !stats ? (
        <div className="mt-8 grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4 max-w-[1600px]">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/50 bg-muted/20 p-6 h-40 animate-pulse"
            />
          ))}
        </div>
      ) : stats ? (
        <div className="mt-8 space-y-10 max-w-[1600px]">
          {/* KPI */}
          <section aria-label="Indicateurs clés">
            <SectionTitle
              icon="solar:widget-5-linear"
              title="Indicateurs clés"
              description="Synthèse quantitative sur la période sélectionnée."
            />
            <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                value={stats.totals.total}
                label="Courriers (période)"
                sub="Volume total sur l’intervalle"
                icon="solar:inbox-in-linear"
                iconClassName="bg-primary/15 text-primary"
                href={listCourrierGlobalHref}
                hrefLabel="Voir la liste filtrée"
              />
              <StatCard
                value={stats.totals.courriersAujourdhui}
                label="Arrivées aujourd’hui"
                sub="Nouveaux courriers (date d’arrivée)"
                icon="solar:calendar-date-linear"
                iconClassName="bg-sky-500/15 text-sky-600 dark:text-sky-400"
              />
              <StatCard
                value={
                  <>
                    {stats.totals.assigned}
                    <span className="text-xl font-normal text-muted-foreground"> / </span>
                    {stats.totals.unassigned}
                  </>
                }
                label="Affectés / non affectés"
                sub="Répartition du travail"
                icon="solar:user-check-rounded-linear"
                iconClassName="bg-amber-500/15 text-amber-600 dark:text-amber-400"
              />
              <StatCard
                value={
                  stats.delaiCloture.moyenneJours != null
                    ? `${stats.delaiCloture.moyenneJours.toFixed(1)} j`
                    : '—'
                }
                label="Délai moyen (clôturé / visé)"
                sub={
                  stats.delaiCloture.echantillon > 0
                    ? `Échantillon : ${stats.delaiCloture.echantillon} courriers`
                    : 'Pas assez de données'
                }
                icon="solar:stopwatch-linear"
                iconClassName="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              />
            </div>
          </section>

          {/* Répartitions */}
          <section aria-label="Répartitions">
            <div className="grid gap-6 lg:grid-cols-2">
              <CardBox className="p-6 sm:p-7 rounded-2xl border-border/70 shadow-sm h-full">
                <SectionTitle
                  icon="solar:pie-chart-2-linear"
                  title="Répartition par statut"
                  description="Répartition des courriers selon leur état dans le circuit."
                />
                <BarBreakdown
                  entries={Object.entries(stats.parStatut)}
                  labelKey={STATUT_LABELS}
                  total={stats.totals.total}
                  colorMap={STATUT_BAR_COLORS}
                />
              </CardBox>
              <CardBox className="p-6 sm:p-7 rounded-2xl border-border/70 shadow-sm h-full">
                <SectionTitle
                  icon="solar:flag-linear"
                  title="Répartition par priorité"
                  description="Charge et niveaux d’urgence."
                />
                <BarBreakdown
                  entries={Object.entries(stats.parPriorite)}
                  labelKey={PRIORITE_LABELS}
                  total={stats.totals.total}
                  colorMap={PRIORITE_BAR_COLORS}
                />
              </CardBox>
            </div>
          </section>

          {/* Série temporelle */}
          <CardBox className="p-6 sm:p-7 rounded-2xl border-border/70 shadow-sm">
            <SectionTitle
              icon="solar:chart-2-linear"
              title="Arrivées par mois"
              description="Évolution des enregistrements selon la date d’arrivée."
            />
            {stats.timeSeries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 rounded-xl border border-dashed bg-muted/15">
                <Icon icon="solar:calendar-minimalistic-linear" className="size-12 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Aucune donnée pour cette période</p>
              </div>
            ) : (
              <div className="rounded-xl bg-muted/20 border border-border/50 p-4 sm:p-6 overflow-x-auto">
                <div className="flex items-end gap-1.5 sm:gap-2 min-h-[200px] pb-6 min-w-min">
                  {(() => {
                    const max = Math.max(...stats.timeSeries.map((t) => t.count), 1);
                    return stats.timeSeries.map((t) => {
                      const h = Math.max(12, (t.count / max) * 160);
                      return (
                        <div
                          key={t.bucket}
                          className="flex flex-col items-center gap-2 group w-8 sm:w-10 shrink-0">
                          <span className="text-[10px] sm:text-xs font-semibold tabular-nums text-foreground opacity-0 group-hover:opacity-100 transition-opacity -mb-1">
                            {t.count}
                          </span>
                          <div
                            className="w-full rounded-t-lg bg-gradient-to-t from-primary/90 to-primary/50 shadow-inner ring-1 ring-primary/20 transition-transform group-hover:scale-[1.02] origin-bottom"
                            style={{ height: `${h}px` }}
                            title={`${t.bucket}: ${t.count} courrier(s)`}
                          />
                          <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium truncate max-w-[3.5rem] text-center leading-tight">
                            {t.bucket.slice(5)}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </CardBox>

          {/* Entités — présentation type page Organigramme (arbre + bordure gauche) */}
          <section aria-label="Par entité">
            <CardBox className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                  <h5 className="card-title">Performance par entité traitante</h5>
                  <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
                    Même présentation que l&apos;
                    <Link href="/courrier/organigramme" className="text-primary font-medium hover:underline">
                      Organigramme
                    </Link>
                    : utilisez <span className="font-medium text-foreground">+</span> /{' '}
                    <span className="font-medium text-foreground">−</span> pour afficher chaque niveau ; chaque
                    ligne montre le volume sur la période et un accès à la liste filtrée.
                  </p>
                </div>
              </div>
              {entiteForest.length === 0 ? (
                <p className="text-muted-foreground">Aucune unité dans le périmètre.</p>
              ) : (
                <div className="space-y-1.5">
                  {entiteForest.map((n) => (
                    <EntiteStatsTreeNode
                      key={n.unitId}
                      node={n}
                      listCourrierHref={listCourrierHref}
                      rowStripeMap={entiteRowStripeMap}
                    />
                  ))}
                </div>
              )}
            </CardBox>
          </section>

          {/* Typologies & Visas */}
          <div className="grid gap-6 lg:grid-cols-2">
            <CardBox className="p-6 sm:p-7 rounded-2xl border-border/70 shadow-sm">
              <SectionTitle
                icon="solar:documents-linear"
                title="Typologies"
                description="Répartition par type de courrier."
              />
              <DataTableShell>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-semibold">Typologie</TableHead>
                      <TableHead className="font-semibold">Parent</TableHead>
                      <TableHead className="text-right font-semibold w-20">N</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.parTypologie.map((row, i) => (
                      <TableRow
                        key={`${row.typologieId ?? 'none'}-${i}`}
                        className={cn('border-border/40', i % 2 === 0 && 'bg-muted/5')}>
                        <TableCell className="font-medium">{row.libelle}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {row.parentLibelle ?? '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{row.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataTableShell>
            </CardBox>
            <CardBox className="p-6 sm:p-7 rounded-2xl border-border/70 shadow-sm">
              <SectionTitle
                icon="solar:pen-new-square-linear"
                title="Circuit des visas"
                description="État des demandes et charge par signataire."
              />
              <BarBreakdown
                entries={Object.entries(stats.visas.parStatut)}
                labelKey={VISA_STATUT_LABELS}
                total={Object.values(stats.visas.parStatut).reduce((a, b) => a + b, 0)}
                colorMap={VISA_BAR_COLORS}
              />
              {stats.visas.delaiMoyenReponseJours != null ? (
                <div className="mt-6 flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 text-sm">
                  <Icon icon="solar:clock-circle-linear" className="size-5 text-primary shrink-0" />
                  <span>
                    Délai moyen de réponse :{' '}
                    <strong className="text-foreground">
                      {stats.visas.delaiMoyenReponseJours.toFixed(1)} jours
                    </strong>
                  </span>
                </div>
              ) : null}
              {stats.visas.parUtilisateur.length > 0 ? (
                <DataTableShell className="mt-5">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="font-semibold">Signataire / avis</TableHead>
                        <TableHead className="text-right font-semibold w-14">Att.</TableHead>
                        <TableHead className="text-right font-semibold w-14">Visé</TableHead>
                        <TableHead className="text-right font-semibold w-14">Ref.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.visas.parUtilisateur.slice(0, 20).map((u, i) => (
                        <TableRow key={u.userId} className={cn('border-border/40', i % 2 === 0 && 'bg-muted/5')}>
                          <TableCell className="text-sm py-3">
                            <span className="font-medium block">{u.name ?? u.email}</span>
                            {u.name ? (
                              <span className="text-xs text-muted-foreground block truncate max-w-[200px]">
                                {u.email}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{u.enAttente}</TableCell>
                          <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                            {u.vise}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-destructive/90">
                            {u.refuse}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </DataTableShell>
              ) : null}
            </CardBox>
          </div>

          {/* Transferts & Accusés */}
          <div className="grid gap-6 lg:grid-cols-2">
            <CardBox className="p-6 sm:p-7 rounded-2xl border-border/70 shadow-sm">
              <SectionTitle
                icon="solar:transfer-horizontal-linear"
                title="Transferts"
                description={`${stats.transferts.total} transfert(s) enregistré(s) sur la période.`}
              />
              <DataTableShell>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-semibold">Unité destination</TableHead>
                      <TableHead className="text-right font-semibold w-24">Nombre</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.transferts.topDestinations.map((row, i) => (
                      <TableRow
                        key={row.unitId ?? `null-${i}`}
                        className={cn('border-border/40', i % 2 === 0 && 'bg-muted/5')}>
                        <TableCell>{row.libelle}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{row.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataTableShell>
            </CardBox>
            <CardBox className="p-6 sm:p-7 rounded-2xl border-border/70 shadow-sm">
              <SectionTitle
                icon="solar:letter-unread-linear"
                title="Accusés de réception"
                description={`${stats.accuses.total} envoi(s) sur la période.`}
              />
              <DataTableShell>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-semibold">Mode d’envoi</TableHead>
                      <TableHead className="text-right font-semibold w-24">Nombre</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(stats.accuses.parMode).map(([mode, n], i) => (
                      <TableRow key={mode} className={cn('border-border/40', i % 2 === 0 && 'bg-muted/5')}>
                        <TableCell>{mode}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{n}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataTableShell>
            </CardBox>
          </div>

          {/* Expéditeurs */}
          <CardBox className="p-6 sm:p-7 rounded-2xl border-border/70 shadow-sm">
            <SectionTitle
              icon="solar:user-speak-rounded-linear"
              title="Principaux expéditeurs"
              description="Contacts à l’origine du plus grand volume de courriers."
            />
            <DataTableShell>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold">Contact</TableHead>
                    <TableHead className="text-right font-semibold w-28">Courriers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topExpediteurs.map((row, i) => (
                    <TableRow
                      key={row.contactId}
                      className={cn('border-border/40', i % 2 === 0 && 'bg-muted/5')}>
                      <TableCell className="font-medium">{row.nom}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableShell>
          </CardBox>
        </div>
      ) : null}
    </>
  );
}
