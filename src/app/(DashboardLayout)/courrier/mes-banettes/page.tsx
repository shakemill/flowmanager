'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import BreadcrumbComp from '@/app/(DashboardLayout)/layout/shared/breadcrumb/BreadcrumbComp';
import CardBox from '@/app/components/shared/CardBox';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/lib/toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const BCrumb = [{ to: '/', title: 'Accueil' }, { to: '/courrier', title: 'Courrier' }, { title: 'Mes banettes' }];

type ViewKey = 'a_traiter' | 'mon_service' | 'en_attente_mes_avis' | 'transferes_a_moi' | 'en_attente_avis' | 'retour_avis' | 'archives';

const VIEWS: { key: ViewKey; label: string; icon: string }[] = [
  { key: 'a_traiter', label: 'À traiter', icon: 'solar:clipboard-list-linear' },
  { key: 'mon_service', label: 'Courrier de mon service', icon: 'solar:folder-linear' },
  { key: 'en_attente_mes_avis', label: 'En attente de mes avis', icon: 'solar:document-text-linear' },
  { key: 'transferes_a_moi', label: 'Transférés à moi', icon: 'solar:inbox-arrow-down-linear' },
  { key: 'en_attente_avis', label: 'En attente des avis (tous)', icon: 'solar:clock-circle-linear' },
  { key: 'retour_avis', label: 'Retour des avis', icon: 'solar:verified-check-linear' },
  { key: 'archives', label: 'Archivés', icon: 'solar:archive-down-linear' },
];

interface CourrierRow {
  id: string;
  numero: string;
  priorite: string;
  dateCourrier: string;
  dateArrivee: string;
  objet: string;
  statut: string;
  expediteur: { id: string; nom: string; email: string | null; raisonSociale?: string | null };
  entiteTraitante: { id: string; libelle: string };
  assignedTo?: { id: string; name: string | null; email: string } | null;
}

function prioriteBadgeClass(p: string): string {
  return p === 'URGENT'
    ? 'bg-destructive/15 text-destructive'
    : p === 'HAUTE'
      ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
      : p === 'BASSE'
        ? 'bg-muted text-muted-foreground'
        : 'bg-primary/15 text-primary';
}

function statutBadgeClass(s: string): string {
  const map: Record<string, string> = {
    ENREGISTRE: 'bg-slate-500/15 text-slate-600 dark:text-slate-400',
    EN_TRAITEMENT: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    EN_VISA: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    VISÉ: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    CLOTURE: 'bg-green-500/15 text-green-600 dark:text-green-400',
    ANNULE: 'bg-muted text-muted-foreground',
  };
  return map[s] ?? 'bg-muted text-muted-foreground';
}

function statutLabel(s: string): string {
  const map: Record<string, string> = {
    ENREGISTRE: 'Enregistré',
    EN_TRAITEMENT: 'En traitement',
    EN_VISA: 'En visa',
    VISÉ: 'Visé',
    CLOTURE: 'Clôturé',
    ANNULE: 'Annulé',
  };
  return map[s] ?? s;
}

const VIEW_KEYS: ViewKey[] = ['a_traiter', 'mon_service', 'en_attente_mes_avis', 'transferes_a_moi', 'en_attente_avis', 'retour_avis', 'archives'];

export default function MesBanettesPage() {
  const searchParams = useSearchParams();
  const viewFromUrl = searchParams.get('view') as ViewKey | null;
  const [view, setView] = useState<ViewKey>(VIEW_KEYS.includes(viewFromUrl ?? '') ? viewFromUrl! : 'a_traiter');
  const [courriers, setCourriers] = useState<CourrierRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    const v = searchParams.get('view') as ViewKey | null;
    if (v && VIEW_KEYS.includes(v)) setView(v);
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('view', view);
    params.set('page', String(page));
    params.set('limit', String(limit));
    fetch(`/api/courrier?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setCourriers(data.courriers ?? []);
        setTotal(data.total ?? 0);
      })
      .catch((e) => {
        toast.error(e.message);
        setCourriers([]);
      })
      .finally(() => setLoading(false));
  }, [view, page]);

  const totalPages = Math.ceil(total / limit) || 1;
  const currentView = VIEWS.find((v) => v.key === view);

  return (
    <>
      <BreadcrumbComp title="Mes banettes" items={BCrumb} />
      <CardBox className="p-6">
        <h5 className="card-title mb-4 flex items-center gap-2">
          <Icon icon="solar:box-linear" className="size-5" />
          Mes banettes
        </h5>
        <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
          {VIEWS.map((v) => (
            <Button
              key={v.key}
              variant={view === v.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setView(v.key); setPage(1); }}
              className="gap-1.5"
            >
              <Icon icon={v.icon} className="size-4" />
              {v.label}
            </Button>
          ))}
        </div>
        <div className="mb-2 text-sm text-muted-foreground flex items-center gap-2">
          <Icon icon={currentView?.icon} className="size-4" />
          {currentView?.label}
          <span className="font-medium text-foreground">({total})</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Icon icon="solar:refresh-linear" className="size-6 animate-spin mr-2" />
            Chargement...
          </div>
        ) : courriers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground rounded-lg border border-dashed bg-muted/20">
            <Icon icon="solar:inbox-linear" className="size-12 mx-auto mb-2 opacity-50" />
            <p>Aucun courrier dans cette banette.</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Numéro</TableHead>
                  <TableHead className="w-[80px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priorité</TableHead>
                  <TableHead className="min-w-[180px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Objet</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expéditeur</TableHead>
                  <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statut</TableHead>
                  <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date arrivée</TableHead>
                  <TableHead className="w-[90px] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courriers.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-mono text-xs font-medium">{c.numero}</TableCell>
                    <TableCell>
                      <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-medium', prioriteBadgeClass(c.priorite))}>
                        {c.priorite}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[220px]" title={c.objet}>
                      <span className="truncate block font-medium text-foreground">{c.objet}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="text-foreground font-medium">{c.expediteur?.nom ?? '—'}</span>
                        {c.expediteur?.raisonSociale?.trim() && (
                          <p className="text-xs text-muted-foreground mt-0.5">{c.expediteur.raisonSociale}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-medium', statutBadgeClass(c.statut))}>
                        {statutLabel(c.statut)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {format(new Date(c.dateArrivee), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild className="gap-1.5">
                        <Link href={`/courrier/${c.id}`}>
                          <Icon icon="solar:eye-linear" className="size-4" />
                          Ouvrir
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Précédent
            </Button>
            <span className="flex items-center px-2 text-sm text-muted-foreground">
              Page {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Suivant
            </Button>
          </div>
        )}
      </CardBox>
    </>
  );
}
