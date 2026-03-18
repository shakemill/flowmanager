'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useSession } from 'next-auth/react';
import BreadcrumbComp from '@/app/(DashboardLayout)/layout/shared/breadcrumb/BreadcrumbComp';
import CardBox from '@/app/components/shared/CardBox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface Recipiendaire {
  id: string;
  email: string;
  name: string | null;
}

interface OrganisationUnitDetail {
  id: string;
  libelle: string;
  parentId: string | null;
  niveau: number;
  ordre: number;
  entiteTraitante?: boolean;
  recipiendaire?: Recipiendaire | null;
  parent?: { id: string; libelle: string } | null;
  childrenCount?: number;
}

interface AccessRow {
  id: string;
  userId: string;
  organisationUnitId: string;
  niveauAcces: string;
  user: { id: string; email: string; name: string | null };
  organisationUnit: { id: string; libelle: string };
}

const NIVEAUX = [
  { value: 'LECTURE', label: 'Lecture' },
  { value: 'TRAITEMENT', label: 'Traitement' },
  { value: 'VALIDATION', label: 'Validation' },
  { value: 'ADMIN', label: 'Admin' },
] as const;

function flattenUnits(
  nodes: { id: string; libelle: string; children?: unknown[] }[],
  level = 0
): { id: string; libelle: string; indent: string }[] {
  const out: { id: string; libelle: string; indent: string }[] = [];
  for (const n of nodes) {
    out.push({ id: n.id, libelle: n.libelle, indent: '—'.repeat(level) });
    if (n.children?.length) {
      out.push(...flattenUnits(n.children as { id: string; libelle: string; children?: unknown[] }[], level + 1));
    }
  }
  return out;
}

function getUserServiceLabel(u: { userOrganisationUnits?: { organisationUnit: { libelle: string } }[]; email: string }) {
  const libelles = u.userOrganisationUnits?.map((x) => x.organisationUnit?.libelle).filter(Boolean) ?? [];
  return libelles.length > 0 ? libelles.join(', ') : u.email;
}

function filterUsersBySearch(
  users: { id: string; email: string; name: string | null }[],
  search: string
): { id: string; email: string; name: string | null }[] {
  const q = search.trim().toLowerCase();
  if (q.length < 3) return [];
  return users.filter(
    (u) =>
      (u.name?.toLowerCase().includes(q) ?? false) ||
      u.email.toLowerCase().includes(q)
  );
}

export default function OrganigrammeUnitPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const parentIdFromQuery = searchParams.get('parentId');
  const isCreate = id === 'nouveau';

  const [unit, setUnit] = useState<OrganisationUnitDetail | null>(null);
  const [tree, setTree] = useState<{ id: string; libelle: string; children?: unknown[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [libelle, setLibelle] = useState('');
  const [parentId, setParentId] = useState<string>(parentIdFromQuery ?? '');
  const [recipiendaireId, setRecipiendaireId] = useState('');
  const [recipiendaireSearch, setRecipiendaireSearch] = useState('');
  const [recipiendaireOpen, setRecipiendaireOpen] = useState(false);
  const [entiteTraitante, setEntiteTraitante] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<{ id: string; email: string; name: string | null; userOrganisationUnits?: { organisationUnit: { libelle: string } }[] }[]>([]);
  const [accessList, setAccessList] = useState<AccessRow[]>([]);
  const [addAccessUserId, setAddAccessUserId] = useState('');
  const [addAccessNiveau, setAddAccessNiveau] = useState('LECTURE');
  const [addingAccess, setAddingAccess] = useState(false);
  const [updatingNiveauId, setUpdatingNiveauId] = useState<string | null>(null);
  const [removeAccessOpen, setRemoveAccessOpen] = useState(false);
  const [accessToRemove, setAccessToRemove] = useState<AccessRow | null>(null);
  const [removingAccess, setRemovingAccess] = useState(false);
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === 'admin';

  const unitAccessList = unit ? accessList.filter((a) => a.organisationUnitId === unit.id) : [];
  const usersNotInUnit = unit ? users.filter((u) => !unitAccessList.some((a) => a.userId === u.id)) : [];

  useEffect(() => {
    if (parentIdFromQuery && !parentId) setParentId(parentIdFromQuery);
  }, [parentIdFromQuery, parentId]);

  useEffect(() => {
    if (isCreate) {
      Promise.all([
        fetch('/api/organisation-units/tree').then((r) => r.json()),
      ])
        .then(([treeData]) => {
          setTree(Array.isArray(treeData) ? treeData : treeData?.data ?? []);
        })
        .catch((e) => toast.error(e.message))
        .finally(() => setLoading(false));
      return;
    }
    Promise.all([
      fetch(`/api/organisation-units/${id}`).then((r) => r.json()),
      fetch('/api/access').then((r) => r.json()),
    ])
      .then(([unitData, aData]) => {
        if (unitData.error) throw new Error(unitData.error);
        setUnit(unitData);
        setLibelle(unitData.libelle ?? '');
        setRecipiendaireId(unitData.recipiendaire?.id ?? '');
        setEntiteTraitante(unitData.entiteTraitante !== false);
        if (!aData.error && Array.isArray(aData)) setAccessList(aData);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [id, isCreate]);

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((data) => { if (!data.error && Array.isArray(data)) setUsers(data); })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!libelle.trim()) {
      toast.warning('Libellé requis');
      return;
    }
    setSaving(true);
    try {
      if (isCreate) {
        const res = await fetch('/api/organisation-units', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            libelle: libelle.trim(),
            parentId: parentId || undefined,
            entiteTraitante,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Erreur');
        toast.success('Unité créée');
      } else {
        const res = await fetch(`/api/organisation-units/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            libelle: libelle.trim(),
            recipiendaireId: recipiendaireId || null,
            entiteTraitante,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Erreur');
        toast.success('Unité mise à jour');
      }
      router.push('/courrier/organigramme');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeNiveau = async (accessId: string, newNiveau: string) => {
    setUpdatingNiveauId(accessId);
    try {
      const res = await fetch(`/api/access/${accessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niveauAcces: newNiveau }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success('Niveau mis à jour');
      setAccessList((prev) => prev.map((a) => (a.id === accessId ? { ...a, niveauAcces: newNiveau } : a)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setUpdatingNiveauId(null);
    }
  };

  const handleAddAccess = async () => {
    if (!unit || !addAccessUserId) {
      toast.warning('Choisissez un utilisateur');
      return;
    }
    setAddingAccess(true);
    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: addAccessUserId,
          organisationUnitId: unit.id,
          niveauAcces: addAccessNiveau,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success('Utilisateur affecté');
      setAddAccessUserId('');
      setAddAccessNiveau('LECTURE');
      const aRes = await fetch('/api/access').then((r) => r.json());
      if (!aRes.error && Array.isArray(aRes)) setAccessList(aRes);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setAddingAccess(false);
    }
  };

  const handleRemoveAccess = async () => {
    if (!accessToRemove) return;
    setRemovingAccess(true);
    try {
      const res = await fetch(`/api/access/${accessToRemove.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success('Affectation retirée');
      setRemoveAccessOpen(false);
      setAccessToRemove(null);
      const aRes = await fetch('/api/access').then((r) => r.json());
      if (!aRes.error && Array.isArray(aRes)) setAccessList(aRes);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setRemovingAccess(false);
    }
  };

  const unitsFlat = flattenUnits(tree);
  const BCrumb = [
    { to: '/', title: 'Accueil' },
    { to: '/courrier', title: 'Courrier' },
    { to: '/courrier/organigramme', title: 'Organigramme' },
    { title: isCreate ? 'Nouvelle unité' : (unit?.libelle ?? 'Modifier') },
  ];

  if (loading) {
    return (
      <>
        <BreadcrumbComp title={isCreate ? 'Nouvelle unité' : 'Modifier l\'unité'} items={BCrumb} />
        <CardBox className="p-6">
          <p className="text-muted-foreground">Chargement...</p>
        </CardBox>
      </>
    );
  }

  if (!isCreate && !unit) {
    return (
      <>
        <BreadcrumbComp title="Organigramme" items={BCrumb} />
        <CardBox className="p-6">
          <p className="text-muted-foreground">Unité introuvable.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/courrier/organigramme">Retour à l&apos;organigramme</Link>
          </Button>
        </CardBox>
      </>
    );
  }

  return (
    <>
      <BreadcrumbComp title={isCreate ? 'Nouvelle unité' : 'Modifier l\'unité'} items={BCrumb} />
      <CardBox className="p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="flex items-center justify-center size-11 rounded-xl bg-primary/10 text-primary">
            <Icon icon={isCreate ? 'solar:add-circle-linear' : 'solar:pen-linear'} className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">{isCreate ? 'Nouvelle unité' : 'Modifier l\'unité'}</h1>
            <p className="text-sm text-muted-foreground">
              {isCreate ? 'Créez une unité organisationnelle (direction, service, etc.).' : 'Modifiez le libellé, le récipiendaire et les affectations.'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <Label className="text-sm font-medium">Libellé</Label>
            <Input
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="Ex. Direction des finances, Service courrier…"
              className="mt-2"
            />
          </div>

          {isCreate && (
            <div>
              <Label className="text-sm font-medium">Unité parente (optionnel)</Label>
              <Select value={parentId || 'none'} onValueChange={(v) => setParentId(v === 'none' ? '' : v)}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Racine (aucun parent)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Racine (aucun parent)</SelectItem>
                  {unitsFlat.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.indent} {u.libelle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isCreate && unit && (
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Unité actuelle :</span> niveau {unit.niveau}
              {unit.childrenCount != null && unit.childrenCount > 0 && (
                <span> · {unit.childrenCount} sous-unité{unit.childrenCount > 1 ? 's' : ''}</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="entite-traitante"
              checked={entiteTraitante}
              onCheckedChange={(v) => setEntiteTraitante(v === true)}
            />
            <Label htmlFor="entite-traitante" className="text-sm font-normal cursor-pointer">
              Affichée comme entité traitante à l&apos;enregistrement du courrier
            </Label>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Si coché, cette unité apparaît dans la liste « Entité traitante » lors de l&apos;enregistrement d&apos;un courrier.
          </p>

          {!isCreate && unit && (
            <>
              <div>
                <Label className="text-sm font-medium">Récipiendaire du courrier</Label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  Utilisateur affecté à cette unité pour recevoir le courrier transféré. Saisissez au moins 3 caractères pour rechercher par nom ou email.
                </p>
                {recipiendaireId && users.find((x) => x.id === recipiendaireId) ? (
                  <div className="mt-2 flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-medium">
                      {(users.find((x) => x.id === recipiendaireId)?.name || users.find((x) => x.id === recipiendaireId)?.email || '?').charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{users.find((x) => x.id === recipiendaireId)?.name || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{getUserServiceLabel(users.find((x) => x.id === recipiendaireId)!)}</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => { setRecipiendaireId(''); setRecipiendaireOpen(true); }}>
                      Changer
                    </Button>
                  </div>
                ) : (
                  <Popover open={recipiendaireOpen} onOpenChange={(open) => { setRecipiendaireOpen(open); if (!open) setRecipiendaireSearch(''); }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={recipiendaireOpen}
                        className="mt-2 w-full justify-between font-normal"
                      >
                        <span className="text-muted-foreground">Choisir une personne (optionnel)</span>
                        <Icon icon="solar:alt-arrow-down-linear" className="ml-2 size-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command shouldFilter={false} className="bg-transparent">
                        <CommandInput
                          placeholder="Rechercher par nom ou email (min. 3 caractères)"
                          value={recipiendaireSearch}
                          onValueChange={setRecipiendaireSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {recipiendaireSearch.trim().length < 3
                              ? 'Saisissez au moins 3 caractères (nom ou email) pour rechercher'
                              : 'Aucun résultat'}
                          </CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="none"
                              onSelect={() => { setRecipiendaireId(''); setRecipiendaireOpen(false); }}
                            >
                              <Icon icon="solar:user-minus-linear" className="mr-2 size-4" />
                              Aucun
                            </CommandItem>
                            {filterUsersBySearch(users, recipiendaireSearch).map((u) => (
                              <CommandItem
                                key={u.id}
                                value={u.id}
                                onSelect={() => { setRecipiendaireId(u.id); setRecipiendaireOpen(false); }}
                              >
                                <span className="flex flex-col items-start">
                                  <span className="font-medium">{u.name || '—'}</span>
                                  <span className="text-xs text-muted-foreground">{getUserServiceLabel(u)}</span>
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Utilisateurs affectés à cette unité</Label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  Utilisateurs ayant un accès à cette unité. Modifiez le niveau ou retirez une affectation.
                </p>
                {unitAccessList.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">Aucun utilisateur affecté.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {unitAccessList.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2">
                        <span className="flex items-center gap-2 min-w-0">
                          <Icon icon="solar:user-linear" className="size-4 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate">{a.user?.name || a.user?.email || a.userId}</span>
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {isAdmin ? (
                            <Select
                              value={a.niveauAcces}
                              onValueChange={(v) => handleChangeNiveau(a.id, v)}
                              disabled={updatingNiveauId === a.id}
                            >
                              <SelectTrigger className="h-8 w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {NIVEAUX.map((n) => (
                                  <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              {NIVEAUX.find((n) => n.value === a.niveauAcces)?.label ?? a.niveauAcces}
                            </Badge>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive h-8 shrink-0"
                              onClick={() => { setAccessToRemove(a); setRemoveAccessOpen(true); }}
                            >
                              Retirer
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {isAdmin && usersNotInUnit.length > 0 && (
                  <div className="mt-4 rounded-lg border bg-muted/20 p-4 space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ajouter un utilisateur à cette unité</Label>
                    <div className="flex flex-wrap gap-2 items-end">
                      <Select value={addAccessUserId} onValueChange={setAddAccessUserId}>
                        <SelectTrigger className="w-[220px] h-9">
                          <SelectValue placeholder="Choisir un utilisateur" />
                        </SelectTrigger>
                        <SelectContent>
                          {usersNotInUnit.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name ? `${u.name} (${getUserServiceLabel(u)})` : getUserServiceLabel(u)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={addAccessNiveau} onValueChange={setAddAccessNiveau}>
                        <SelectTrigger className="w-[120px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {NIVEAUX.map((n) => (
                            <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={handleAddAccess} disabled={addingAccess || !addAccessUserId}>
                        {addingAccess ? 'Ajout…' : 'Ajouter'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Icon icon="solar:refresh-linear" className="size-4 animate-spin" />
                Enregistrement…
              </>
            ) : (
              <>
                <Icon icon="solar:diskette-linear" className="size-4" />
                Enregistrer
              </>
            )}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/courrier/organigramme">Annuler</Link>
          </Button>
        </div>
      </CardBox>

      <ConfirmDialog
        open={removeAccessOpen}
        onOpenChange={setRemoveAccessOpen}
        title="Retirer l'affectation"
        message={accessToRemove ? `Retirer l'affectation de ${accessToRemove.user?.name || accessToRemove.user?.email} sur cette unité ?` : ''}
        variant="danger"
        confirmLabel="Retirer"
        onConfirm={handleRemoveAccess}
        loading={removingAccess}
      />
    </>
  );
}
