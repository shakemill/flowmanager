'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import BreadcrumbComp from '@/app/(DashboardLayout)/layout/shared/breadcrumb/BreadcrumbComp';
import CardBox from '@/app/components/shared/CardBox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/lib/toast';

const BCrumb = [{ to: '/', title: 'Accueil' }, { to: '/courrier', title: 'Courrier' }, { title: 'Banettes' }];

interface Banette {
  id: string;
  libelle: string;
  code: string;
  description: string | null;
  entiteId: string | null;
  ordre: number;
  actif: boolean;
  entite?: { id: string; libelle: string } | null;
}

interface OrganisationUnit {
  id: string;
  libelle: string;
}

export default function BanettesPage() {
  const [banettes, setBanettes] = useState<Banette[]>([]);
  const [units, setUnits] = useState<OrganisationUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Banette | null>(null);
  const [form, setForm] = useState({ libelle: '', code: '', description: '', entiteId: '', ordre: 0, actif: true });
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Banette | null>(null);

  const load = () => {
    Promise.all([
      fetch('/api/banettes').then((r) => r.json()),
      fetch('/api/organisation-units').then((r) => r.json()),
    ])
      .then(([bData, uData]) => {
        if (bData.error) throw new Error(bData.error);
        if (uData.error) throw new Error(uData.error);
        setBanettes(bData ?? []);
        setUnits(uData ?? []);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ libelle: '', code: '', description: '', entiteId: '', ordre: banettes.length, actif: true });
    setDialogOpen(true);
  };

  const openEdit = (b: Banette) => {
    setEditing(b);
    setForm({
      libelle: b.libelle,
      code: b.code,
      description: b.description ?? '',
      entiteId: b.entiteId ?? '',
      ordre: b.ordre,
      actif: b.actif,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.libelle.trim() || !form.code.trim()) {
      toast.warning('Libellé et code requis');
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/banettes/${editing.id}` : '/api/banettes';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          libelle: form.libelle.trim(),
          code: form.code.trim(),
          description: form.description.trim() || null,
          entiteId: form.entiteId || null,
          ordre: form.ordre,
          actif: form.actif,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success(editing ? 'Banette mise à jour' : 'Banette créée');
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      const res = await fetch(`/api/banettes/${toDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success('Banette supprimée');
      setDeleteOpen(false);
      setToDelete(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  return (
    <>
      <BreadcrumbComp title="Configuration des banettes" items={BCrumb} />
      <CardBox className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h5 className="card-title">Banettes</h5>
          <Button onClick={openCreate}>
            <Icon icon="solar:add-circle-linear" className="mr-2 size-4" />
            Nouvelle banette
          </Button>
        </div>
        {loading ? (
          <p className="text-muted-foreground">Chargement...</p>
        ) : banettes.length === 0 ? (
          <p className="text-muted-foreground">Aucune banette. Créez-en une.</p>
        ) : (
          <div className="space-y-2">
            {banettes.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{b.libelle}</p>
                  <p className="text-sm text-muted-foreground">
                    Code: {b.code}
                    {b.entite && ` • Entité: ${b.entite.libelle}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={b.actif ? 'text-success text-sm' : 'text-muted-foreground text-sm'}>
                    {b.actif ? 'Actif' : 'Inactif'}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => openEdit(b)}>
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setToDelete(b);
                      setDeleteOpen(true);
                    }}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBox>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier la banette' : 'Nouvelle banette'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Libellé</Label>
              <Input
                value={form.libelle}
                onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))}
                placeholder="Libellé"
                className="mt-2"
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="Code unique"
                className="mt-2"
                disabled={!!editing}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description"
                className="mt-2"
              />
            </div>
            <div>
              <Label>Entité</Label>
              <Select value={form.entiteId || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, entiteId: v === 'none' ? '' : v }))}>
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.libelle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ordre</Label>
              <Input
                type="number"
                value={form.ordre}
                onChange={(e) => setForm((f) => ({ ...f, ordre: parseInt(e.target.value, 10) || 0 }))}
                className="mt-2 w-24"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.actif} onCheckedChange={(v) => setForm((f) => ({ ...f, actif: v }))} />
              <Label>Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer la banette"
        message={toDelete ? `Êtes-vous sûr de vouloir supprimer la banette « ${toDelete.libelle } » ?` : ''}
        variant="danger"
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
      />
    </>
  );
}
