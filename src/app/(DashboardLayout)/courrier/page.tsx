'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import BreadcrumbComp from '@/app/(DashboardLayout)/layout/shared/breadcrumb/BreadcrumbComp';
import CardBox from '@/app/components/shared/CardBox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const BCrumb = [{ to: '/', title: 'Accueil' }, { title: 'Liste du courrier' }];

interface CourrierRow {
  id: string;
  numero: string;
  priorite: string;
  dateCourrier: string;
  dateArrivee: string;
  objet: string;
  statut: string;
  expediteur: { id: string; nom: string; email: string | null };
  entiteTraitante: { id: string; libelle: string };
  typologie?: { id: string; libelle: string; parent?: { libelle: string } | null } | null;
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
    CLOTURE: 'bg-green-500/15 text-green-600 dark:text-green-400',
    ANNULE: 'bg-muted text-muted-foreground',
  };
  return map[s] ?? 'bg-muted text-muted-foreground';
}

function statutLabel(s: string): string {
  const map: Record<string, string> = {
    ENREGISTRE: 'Enregistré',
    EN_TRAITEMENT: 'En traitement',
    CLOTURE: 'Clôturé',
    ANNULE: 'Annulé',
  };
  return map[s] ?? s;
}

export default function ListeCourrierPage() {
  const [courriers, setCourriers] = useState<CourrierRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [priorite, setPriorite] = useState<string>('');
  const [statut, setStatut] = useState<string>('');
  const limit = 20;

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (priorite) params.set('priorite', priorite);
    if (statut) params.set('statut', statut);
    fetch(`/api/courrier?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setCourriers(data.courriers ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => setCourriers([]))
      .finally(() => setLoading(false));
  }, [page, priorite, statut]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <>
      <BreadcrumbComp title="Liste du courrier" items={BCrumb} />
      <div className="mt-6 sm:mt-8">
        <CardBox className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="flex flex-wrap gap-4">
            <div>
              <Label className="text-xs">Priorité</Label>
              <Select value={priorite || 'all'} onValueChange={(v) => setPriorite(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[140px] mt-1">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="BASSE">Basse</SelectItem>
                  <SelectItem value="NORMAL">Normale</SelectItem>
                  <SelectItem value="HAUTE">Haute</SelectItem>
                  <SelectItem value="URGENT">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Statut</Label>
              <Select value={statut || 'all'} onValueChange={(v) => setStatut(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[160px] mt-1">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="ENREGISTRE">Enregistré</SelectItem>
                  <SelectItem value="EN_TRAITEMENT">En traitement</SelectItem>
                  <SelectItem value="EN_VISA">En visa</SelectItem>
                  <SelectItem value="VISÉ">Visé</SelectItem>
                  <SelectItem value="CLOTURE">Clôturé</SelectItem>
                  <SelectItem value="ANNULE">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button asChild>
            <Link href="/courrier/enregistrement">
              <Icon icon="solar:add-circle-linear" className="mr-2 size-4" />
              Nouveau courrier
            </Link>
          </Button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Icon icon="solar:refresh-linear" className="size-6 animate-spin mr-2" />
            Chargement...
          </div>
        ) : courriers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground rounded-lg border border-dashed bg-muted/20">
            <Icon icon="solar:inbox-linear" className="size-12 mx-auto mb-2 opacity-50" />
            <p>Aucun courrier.</p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border overflow-x-auto">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[100px] shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Numéro</TableHead>
                    <TableHead className="w-[80px] shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priorité</TableHead>
                    <TableHead className="w-[100px] shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date arrivée</TableHead>
                    <TableHead className="min-w-[160px] max-w-[280px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Objet</TableHead>
                    <TableHead className="min-w-[120px] max-w-[200px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expéditeur</TableHead>
                    <TableHead className="w-[100px] shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statut</TableHead>
                    <TableHead className="w-[90px] shrink-0 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courriers.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-mono text-xs font-medium whitespace-nowrap">{c.numero}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-medium', prioriteBadgeClass(c.priorite))}>
                          {c.priorite}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground whitespace-nowrap">
                        {format(new Date(c.dateArrivee), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell className="max-w-[280px] align-top">
                        <span className="block break-words font-medium text-foreground text-sm leading-snug">{c.objet || '—'}</span>
                      </TableCell>
                      <TableCell className="max-w-[200px] align-top text-muted-foreground">
                        <span className="block break-words text-sm leading-snug">{c.expediteur?.nom ?? '—'}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-medium', statutBadgeClass(c.statut))}>
                          {statutLabel(c.statut)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" asChild className="gap-1.5">
                          <Link href={`/courrier/${c.id}`}>
                            <Icon icon="solar:eye-linear" className="size-4" />
                            Voir
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {total} courrier(s) • page {page} / {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Précédent
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Suivant
                </Button>
              </div>
            </div>
          </>
        )}
      </CardBox>
      </div>
    </>
  );
}
