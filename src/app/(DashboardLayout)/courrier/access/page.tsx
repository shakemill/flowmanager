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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/lib/toast';

const BCrumb = [{ to: '/', title: 'Accueil' }, { to: '/courrier', title: 'Courrier' }, { title: 'Gestion des accès' }];

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  userOrganisationUnits: {
    id: string;
    organisationUnitId: string;
    niveauAcces: string;
    organisationUnit: { id: string; libelle: string };
  }[];
}

interface OrganisationUnit {
  id: string;
  libelle: string;
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

export default function GestionAccessPage() {
  const { data: session, status } = useSession();
  const [accessList, setAccessList] = useState<AccessRow[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<OrganisationUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedNiveau, setSelectedNiveau] = useState<string>('LECTURE');
  const [adding, setAdding] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AccessRow | null>(null);
  const isAdmin = (session?.user as { role?: string })?.role === 'admin';

  const load = () => {
    Promise.all([
      fetch('/api/access').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
      fetch('/api/organisation-units').then((r) => r.json()),
    ])
      .then(([aData, uData, oData]) => {
        if (aData.error) throw new Error(aData.error);
        if (uData.error) throw new Error(uData.error);
        if (oData.error) throw new Error(oData.error);
        setAccessList(Array.isArray(aData) ? aData : []);
        setUsers(Array.isArray(uData) ? uData : []);
        setUnits(Array.isArray(oData) ? oData : []);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (!selectedUserId || !selectedUnitId) {
      toast.warning('Sélectionnez un utilisateur et une unité');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          organisationUnitId: selectedUnitId,
          niveauAcces: selectedNiveau,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success('Accès ajouté');
      setSelectedUserId('');
      setSelectedUnitId('');
      setSelectedNiveau('LECTURE');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      const res = await fetch(`/api/access/${toDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success('Accès supprimé');
      setDeleteOpen(false);
      setToDelete(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  if (status === 'loading') return <p className="text-muted-foreground">Chargement...</p>;

  return (
    <>
      <BreadcrumbComp title="Gestion des accès" items={BCrumb} />
      <CardBox className="p-6">
        <h5 className="card-title mb-4 flex items-center gap-2">
          <Icon icon="solar:shield-keyhole-linear" className="size-5" />
          Accès par unité organisationnelle
        </h5>
        <p className="text-sm text-muted-foreground mb-6">
          Les niveaux définissent les droits : Lecture (consultation), Traitement (création/modification courrier),
          Validation (visa), Admin (gestion complète de l&apos;unité).
        </p>

        {isAdmin && (
          <div className="rounded-lg border p-4 mb-6 bg-muted/30">
            <Label className="font-medium">Ajouter un accès</Label>
            <div className="flex flex-wrap gap-4 mt-2 items-end">
              <div>
                <Label className="text-xs">Utilisateur</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-[220px] mt-1">
                    <SelectValue placeholder="Choisir un utilisateur" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name?.trim() || u.email} {u.name?.trim() ? `(${u.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Unité</Label>
                <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                  <SelectTrigger className="w-[200px] mt-1">
                    <SelectValue placeholder="Choisir une unité" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.libelle}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Niveau</Label>
                <Select value={selectedNiveau} onValueChange={setSelectedNiveau}>
                  <SelectTrigger className="w-[140px] mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NIVEAUX.map((n) => (
                      <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} disabled={adding}>
                {adding ? 'Ajout...' : 'Ajouter'}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Chargement...</p>
        ) : accessList.length === 0 ? (
          <p className="text-muted-foreground">Aucun accès configuré.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Utilisateur</th>
                  <th className="text-left py-2 px-2">Unité</th>
                  <th className="text-left py-2 px-2">Niveau</th>
                  {isAdmin && <th className="text-left py-2 px-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {accessList.map((a) => (
                  <tr key={a.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2">{(a.user?.name?.trim() || a.user?.email) ?? a.userId}</td>
                    <td className="py-2 px-2">{a.organisationUnit?.libelle ?? a.organisationUnitId}</td>
                    <td className="py-2 px-2">{a.niveauAcces}</td>
                    {isAdmin && (
                      <td className="py-2 px-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setToDelete(a);
                            setDeleteOpen(true);
                          }}
                        >
                          Retirer
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isAdmin && (
          <p className="text-sm text-muted-foreground mt-4">
            Seul un administrateur peut ajouter ou retirer des accès.
          </p>
        )}
      </CardBox>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Retirer l'accès"
        message={toDelete ? `Retirer l'accès de ${toDelete.user?.name?.trim() || toDelete.user?.email} sur ${toDelete.organisationUnit?.libelle} ?` : ''}
        variant="danger"
        confirmLabel="Retirer"
        onConfirm={handleDelete}
      />
    </>
  );
}
