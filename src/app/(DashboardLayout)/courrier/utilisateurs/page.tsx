'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useSession } from 'next-auth/react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/lib/toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const BCrumb = [{ to: '/', title: 'Accueil' }, { to: '/courrier', title: 'Courrier' }, { title: 'Gestion des utilisateurs' }];

interface OrganisationUnit {
  id: string;
  libelle: string;
}

interface UserOrganisationUnitRow {
  id: string;
  organisationUnitId: string;
  niveauAcces: string;
  organisationUnit: { id: string; libelle: string };
}

interface RoleOption {
  id: string;
  code: string;
  libelle: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  roles?: RoleOption[];
  userOrganisationUnits: UserOrganisationUnitRow[];
}

const NIVEAUX = [
  { value: 'LECTURE', label: 'Lecture' },
  { value: 'TRAITEMENT', label: 'Traitement' },
  { value: 'VALIDATION', label: 'Validation' },
  { value: 'ADMIN', label: 'Admin' },
] as const;

const NIVEAU_BADGE: Record<string, string> = {
  LECTURE: 'bg-muted text-muted-foreground',
  TRAITEMENT: 'bg-primary/15 text-primary',
  VALIDATION: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  ADMIN: 'bg-destructive/15 text-destructive',
};

function userInitials(name: string | null, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

type UnitTreeNode = { id: string; libelle: string; children?: UnitTreeNode[] };

function flattenUnits(
  nodes: UnitTreeNode[],
  level = 0
): { id: string; libelle: string; indent: string }[] {
  const out: { id: string; libelle: string; indent: string }[] = [];
  for (const n of nodes) {
    out.push({ id: n.id, libelle: n.libelle, indent: '—'.repeat(level) });
    if (n.children?.length) {
      out.push(...flattenUnits(n.children, level + 1));
    }
  }
  return out;
}

export default function GestionUtilisateursPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [unitTree, setUnitTree] = useState<UnitTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUser, setAssignUser] = useState<User | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedNiveau, setSelectedNiveau] = useState<string>('LECTURE');
  const [adding, setAdding] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [toRemove, setToRemove] = useState<UserOrganisationUnitRow | null>(null);
  const [removing, setRemoving] = useState(false);
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
  const [creatingUser, setCreatingUser] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
  const [editPassword, setEditPassword] = useState('');
  const [updatingUser, setUpdatingUser] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [newUserRoleCodes, setNewUserRoleCodes] = useState<string[]>([]);
  const [editRoleCodes, setEditRoleCodes] = useState<string[]>([]);
  const isAdmin = (session?.user as { role?: string })?.role === 'admin';
  const currentUserId = (session?.user as { id?: string })?.id ?? null;

  const load = () => {
    Promise.all([
      fetch('/api/users').then((r) => r.json()),
      fetch('/api/organisation-units/tree').then((r) => r.json()),
      ...(isAdmin ? [fetch('/api/roles').then((r) => r.json())] : []),
    ])
      .then((results) => {
        const uData = results[0];
        const treeData = results[1];
        const rolesData = results[2];
        if (uData?.error) throw new Error(uData.error);
        setUsers(Array.isArray(uData) ? uData : []);
        setUnitTree(Array.isArray(treeData) ? treeData : treeData?.data ?? []);
        if (rolesData && !rolesData.error && Array.isArray(rolesData)) {
          setAvailableRoles(rolesData);
        }
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (isAdmin && availableRoles.length === 0) {
      fetch('/api/roles')
        .then((r) => r.json())
        .then((data) => {
          if (!data?.error && Array.isArray(data)) setAvailableRoles(data);
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  const openAssign = (u: User) => {
    setAssignUser(u);
    setSelectedUnitId('');
    setSelectedNiveau('LECTURE');
    setAssignOpen(true);
  };

  const handleAddAccess = async () => {
    if (!assignUser || !selectedUnitId) {
      toast.warning('Choisissez un service');
      return;
    }
    const already = assignUser.userOrganisationUnits.some((uou) => uou.organisationUnitId === selectedUnitId);
    if (already) {
      toast.warning('Cet utilisateur est déjà affecté à ce service');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: assignUser.id,
          organisationUnitId: selectedUnitId,
          niveauAcces: selectedNiveau,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success('Affectation ajoutée');
      setSelectedUnitId('');
      load();
      if (assignUser && data?.id) {
        const newUou = {
          id: data.id,
          organisationUnitId: data.organisationUnitId ?? selectedUnitId,
          niveauAcces: data.niveauAcces ?? selectedNiveau,
          organisationUnit: data.organisationUnit ?? { id: selectedUnitId, libelle: unitsFlat.find((u) => u.id === selectedUnitId)?.libelle ?? '' },
        };
        setAssignUser({ ...assignUser, userOrganisationUnits: [...assignUser.userOrganisationUnits, newUou] });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveAccess = async () => {
    if (!toRemove) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/access/${toRemove.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success('Affectation retirée');
      setRemoveOpen(false);
      setToRemove(null);
      load();
      if (assignUser) {
        setAssignUser({
          ...assignUser,
          userOrganisationUnits: assignUser.userOrganisationUnits.filter((uou) => uou.id !== toRemove.id),
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setRemoving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success('Utilisateur supprimé');
      setDeleteUserOpen(false);
      setUserToDelete(null);
      if (assignUser?.id === userToDelete.id) setAssignUser(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setDeletingUser(false);
    }
  };

  const openAddUser = () => {
    setNewUserEmail('');
    setNewUserName('');
    setNewUserPassword('');
    setNewUserRole('user');
    setNewUserRoleCodes([]);
    setAddUserOpen(true);
  };

  const openEditUser = (u: User) => {
    setEditUser(u);
    setEditEmail(u.email);
    setEditName(u.name ?? '');
    setEditRole((u.role === 'admin' ? 'admin' : 'user') as 'user' | 'admin');
    setEditRoleCodes(u.roles?.map((r) => r.code) ?? []);
    setEditPassword('');
    setEditUserOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editUser) return;
    const email = editEmail.trim();
    if (!email) {
      toast.warning('Email requis');
      return;
    }
    setUpdatingUser(true);
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: editName.trim() || undefined,
          role: editRole,
          roles: editRoleCodes,
          ...(editPassword ? { password: editPassword } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success('Utilisateur mis à jour');
      setEditUserOpen(false);
      setEditUser(null);
      setEditPassword('');
      if (assignUser?.id === editUser.id && data && !Array.isArray(data)) {
        setAssignUser({
          ...assignUser,
          email: data.email ?? assignUser.email,
          name: data.name ?? assignUser.name,
          role: data.role ?? assignUser.role,
          roles: data.roles ?? assignUser.roles,
          userOrganisationUnits: data.userOrganisationUnits ?? assignUser.userOrganisationUnits,
        });
      }
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setUpdatingUser(false);
    }
  };

  const handleCreateUser = async () => {
    const email = newUserEmail.trim();
    const password = newUserPassword.trim();
    if (!email || !password) {
      toast.warning('Email et mot de passe requis');
      return;
    }
    setCreatingUser(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: newUserName.trim() || undefined,
          password,
          role: newUserRole,
          roles: newUserRoleCodes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success('Utilisateur créé');
      setAddUserOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setCreatingUser(false);
    }
  };

  const unitsFlat = flattenUnits(unitTree);

  if (status === 'loading') {
    return (
      <>
        <BreadcrumbComp title="Gestion des utilisateurs" items={BCrumb} />
        <CardBox className="p-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-full max-w-md mb-6" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardBox>
      </>
    );
  }

  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <>
      <BreadcrumbComp title="Gestion des utilisateurs" items={BCrumb} />
      <CardBox className="p-0 overflow-hidden">
        {/* Header avec stats */}
        <div className="border-b bg-muted/30 px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                <span className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary">
                  <Icon icon="solar:users-group-rounded-linear" className="size-5" />
                </span>
                Gestion des utilisateurs
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Liste des utilisateurs et affectation aux services de l&apos;organigramme.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {!loading && users.length > 0 && (
                <>
                  <div className="rounded-lg border bg-background px-4 py-2 text-center min-w-[80px]">
                    <p className="text-2xl font-semibold tabular-nums text-foreground">{users.length}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Utilisateurs</p>
                  </div>
                  <div className="rounded-lg border bg-background px-4 py-2 text-center min-w-[80px]">
                    <p className="text-2xl font-semibold tabular-nums text-primary">{adminCount}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Admins</p>
                  </div>
                </>
              )}
              {isAdmin && (
                <Button onClick={openAddUser} className="gap-2">
                  <Icon icon="solar:add-circle-linear" className="size-5" />
                  Ajouter un utilisateur
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-dashed bg-muted/20">
              <span className="flex items-center justify-center size-16 rounded-full bg-muted text-muted-foreground mb-4">
                <Icon icon="solar:users-group-rounded-linear" className="size-8" />
              </span>
              <h3 className="font-medium text-foreground">Aucun utilisateur</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Les utilisateurs créés apparaîtront ici. Seul un administrateur peut en ajouter.
              </p>
              {isAdmin && (
                <Button onClick={openAddUser} className="mt-6 gap-2">
                  <Icon icon="solar:add-circle-linear" className="size-5" />
                  Ajouter un utilisateur
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
                    <TableHead className="font-semibold text-muted-foreground w-[min(220px,40%)]">Utilisateur</TableHead>
                    <TableHead className="font-semibold text-muted-foreground w-[120px]">Rôle</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">Services affectés</TableHead>
                    {isAdmin && (
                      <TableHead className="font-semibold text-muted-foreground w-[56px] text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow
                      key={u.id}
                      className={cn(
                        'transition-colors hover:bg-muted/25',
                        u.id === currentUserId && 'bg-primary/5'
                      )}
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10 shrink-0 border border-border">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                              {userInitials(u.name, u.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{u.name || '—'}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border shrink-0',
                              u.role === 'admin'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                                : 'bg-muted/60 text-muted-foreground border-border/50'
                            )}
                          >
                            {u.role === 'admin' ? (
                              <Icon icon="solar:shield-check-linear" className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <Icon icon="solar:user-linear" className="size-4 shrink-0 text-muted-foreground" />
                            )}
                            {u.role === 'admin' ? 'Admin' : 'Utilisateur'}
                          </span>
                          {(u.roles ?? []).map((r) => (
                            <span
                              key={r.id}
                              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 text-xs font-medium"
                            >
                              <Icon icon="solar:document-text-linear" className="size-3.5 shrink-0" />
                              {r.libelle}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        {u.userOrganisationUnits.length === 0 ? (
                          <span className="text-muted-foreground text-sm italic">Aucun service</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {u.userOrganisationUnits.map((uou) => (
                              <span
                                key={uou.id}
                                className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 pl-2.5 pr-2 py-1 text-xs border border-border/50"
                              >
                                <Icon icon="solar:buildings-2-linear" className="size-3.5 text-muted-foreground shrink-0" />
                                <span className="font-medium text-foreground">{uou.organisationUnit.libelle}</span>
                                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', NIVEAU_BADGE[uou.niveauAcces] ?? 'bg-muted')}>
                                  {NIVEAUX.find((n) => n.value === uou.niveauAcces)?.label ?? uou.niveauAcces}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 shrink-0">
                                <Icon icon="solar:menu-dots-linear" className="size-5 text-muted-foreground" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onClick={() => openEditUser(u)}>
                                <Icon icon="solar:pen-2-linear" className="size-4 mr-2" />
                                Modifier l&apos;utilisateur
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { openAssign(u); }}>
                                <Icon icon="solar:buildings-2-linear" className="size-4 mr-2" />
                                Affecter aux services
                              </DropdownMenuItem>
                              {u.id === currentUserId ? (
                                <DropdownMenuItem disabled className="text-muted-foreground">
                                  <Icon icon="solar:trash-bin-trash-linear" className="size-4 mr-2" />
                                  Supprimer (vous)
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => { setUserToDelete(u); setDeleteUserOpen(true); }}
                                >
                                  <Icon icon="solar:trash-bin-trash-linear" className="size-4 mr-2" />
                                  Supprimer l&apos;utilisateur
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!isAdmin && users.length > 0 && (
            <p className="text-sm text-muted-foreground mt-4 flex items-center gap-2">
              <Icon icon="solar:info-circle-linear" className="size-4 shrink-0" />
              Seul un administrateur peut modifier les affectations aux services.
            </p>
          )}
        </div>
      </CardBox>

      {/* Dialog Affecter aux services */}
      <Dialog open={assignOpen} onOpenChange={(open) => { setAssignOpen(open); if (!open) setAssignUser(null); setToRemove(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center size-11 rounded-xl bg-primary/10 text-primary shrink-0">
                <Icon icon="solar:buildings-2-linear" className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle>Affecter aux services</DialogTitle>
                {assignUser && (
                  <div className="flex items-center gap-3 mt-3 p-3 rounded-lg bg-muted/40 border">
                    <Avatar className="size-9 shrink-0 border border-border">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {userInitials(assignUser.name, assignUser.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{assignUser.name || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{assignUser.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>
          {assignUser && (
            <div className="space-y-5 py-2">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Affectations actuelles</Label>
                {assignUser.userOrganisationUnits.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2 rounded-lg border border-dashed py-4 text-center bg-muted/20">Aucune affectation.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {assignUser.userOrganisationUnits.map((uou) => (
                      <li
                        key={uou.id}
                        className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5 hover:bg-muted/30 transition-colors"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <Icon icon="solar:buildings-2-linear" className="size-4 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate">{uou.organisationUnit.libelle}</span>
                          <Badge className={`text-xs shrink-0 ${NIVEAU_BADGE[uou.niveauAcces] ?? 'bg-muted'}`}>
                            {NIVEAUX.find((n) => n.value === uou.niveauAcces)?.label ?? uou.niveauAcces}
                          </Badge>
                        </span>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={() => { setToRemove(uou); setRemoveOpen(true); }}
                          >
                            Retirer
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {isAdmin && (
                <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ajouter une affectation</Label>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs">Service (organigramme)</Label>
                      <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Choisir un service" />
                        </SelectTrigger>
                        <SelectContent>
                          {unitsFlat.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.indent} {u.libelle}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Niveau</Label>
                      <Select value={selectedNiveau} onValueChange={setSelectedNiveau}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {NIVEAUX.map((n) => (
                            <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddAccess} disabled={adding || !selectedUnitId}>
                      {adding ? 'Ajout…' : 'Ajouter'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ajouter un utilisateur */}
      <Dialog open={addUserOpen} onOpenChange={(open) => { setAddUserOpen(open); if (!open) { setNewUserEmail(''); setNewUserName(''); setNewUserPassword(''); setNewUserRole('user'); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center size-11 rounded-xl bg-primary/10 text-primary shrink-0">
                <Icon icon="solar:user-add-linear" className="size-6" />
              </span>
              <div>
                <DialogTitle>Ajouter un utilisateur</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Créez un compte avec email et mot de passe.</p>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium">Email</Label>
              <Input
                type="email"
                placeholder="exemple@mairie.fr"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="mt-1.5"
                autoComplete="email"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Nom (optionnel)</Label>
              <Input
                type="text"
                placeholder="Prénom Nom"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="mt-1.5"
                autoComplete="name"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Mot de passe</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="mt-1.5"
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Rôle principal</Label>
              <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as 'user' | 'admin')}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utilisateur</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {availableRoles.length > 0 && (
              <div>
                <Label className="text-xs font-medium">Rôles métier (plusieurs possibles)</Label>
                <div className="mt-2 flex flex-wrap gap-4">
                  {availableRoles.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={newUserRoleCodes.includes(r.code)}
                        onCheckedChange={(checked) => {
                          setNewUserRoleCodes((prev) =>
                            checked ? [...prev, r.code] : prev.filter((c) => c !== r.code)
                          );
                        }}
                      />
                      <span className="text-sm">{r.libelle}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddUserOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateUser} disabled={creatingUser || !newUserEmail.trim() || !newUserPassword.trim()}>
              {creatingUser ? 'Création…' : 'Créer l\'utilisateur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Modifier l'utilisateur */}
      <Dialog
        open={editUserOpen}
        onOpenChange={(open) => {
          setEditUserOpen(open);
          if (!open) {
            setEditUser(null);
            setEditPassword('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center size-11 rounded-xl bg-primary/10 text-primary shrink-0">
                <Icon icon="solar:pen-2-linear" className="size-6" />
              </span>
              <div>
                <DialogTitle>Modifier l&apos;utilisateur</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {editUser ? (editUser.name || editUser.email) : ''}
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium">Email</Label>
              <Input
                type="email"
                placeholder="exemple@mairie.fr"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="mt-1.5"
                autoComplete="email"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Nom (optionnel)</Label>
              <Input
                type="text"
                placeholder="Prénom Nom"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1.5"
                autoComplete="name"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Nouveau mot de passe (optionnel)</Label>
              <Input
                type="password"
                placeholder="Laisser vide pour ne pas changer"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                className="mt-1.5"
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Rôle principal</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as 'user' | 'admin')}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utilisateur</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {availableRoles.length > 0 && (
              <div>
                <Label className="text-xs font-medium">Rôles métier (plusieurs possibles)</Label>
                <div className="mt-2 flex flex-wrap gap-4">
                  {availableRoles.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={editRoleCodes.includes(r.code)}
                        onCheckedChange={(checked) => {
                          setEditRoleCodes((prev) =>
                            checked ? [...prev, r.code] : prev.filter((c) => c !== r.code)
                          );
                        }}
                      />
                      <span className="text-sm">{r.libelle}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditUserOpen(false)}>Annuler</Button>
            <Button
              onClick={handleUpdateUser}
              disabled={updatingUser || !editEmail.trim()}
            >
              {updatingUser ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Retirer l'affectation"
        message={toRemove ? `Retirer l'affectation « ${toRemove.organisationUnit.libelle} » pour cet utilisateur ?` : ''}
        variant="danger"
        confirmLabel="Retirer"
        onConfirm={handleRemoveAccess}
        loading={removing}
      />

      <ConfirmDialog
        open={deleteUserOpen}
        onOpenChange={(open) => { setDeleteUserOpen(open); if (!open) setUserToDelete(null); }}
        title="Supprimer l'utilisateur"
        message={userToDelete ? `Supprimer définitivement l'utilisateur « ${userToDelete.name || userToDelete.email} » ? Cette action est irréversible.` : ''}
        variant="danger"
        confirmLabel="Supprimer"
        onConfirm={handleDeleteUser}
        loading={deletingUser}
      />
    </>
  );
}
