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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/lib/toast';

const BCrumb = [{ to: '/', title: 'Accueil' }, { to: '/courrier', title: 'Courrier' }, { title: 'Workflows' }];

interface Etape {
  id: string;
  ordre: number;
  libelle: string;
  type: string;
  organisationUnitId: string | null;
  delaiJours?: number | null;
  organisationUnit?: { id: string; libelle: string } | null;
}

interface Workflow {
  id: string;
  nom: string;
  description: string | null;
  actif: boolean;
  etapes: Etape[];
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [units, setUnits] = useState<{ id: string; libelle: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Workflow | null>(null);
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [etapesOpen, setEtapesOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [newEtapeLibelle, setNewEtapeLibelle] = useState('');
  const [newEtapeType, setNewEtapeType] = useState('SAISIE');
  const [newEtapeUnitId, setNewEtapeUnitId] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingEtape, setEditingEtape] = useState<Etape | null>(null);
  const [editEtapeLibelle, setEditEtapeLibelle] = useState('');
  const [editEtapeType, setEditEtapeType] = useState('SAISIE');
  const [editEtapeUnitId, setEditEtapeUnitId] = useState('');
  const [editEtapeOrdre, setEditEtapeOrdre] = useState(0);
  const [editEtapeDelaiJours, setEditEtapeDelaiJours] = useState<number | ''>('');
  const [deleteEtapeOpen, setDeleteEtapeOpen] = useState(false);
  const [etapeToDelete, setEtapeToDelete] = useState<Etape | null>(null);
  const [deletingEtape, setDeletingEtape] = useState(false);

  const load = () => {
    Promise.all([
      fetch('/api/workflows').then((r) => r.json()),
      fetch('/api/organisation-units').then((r) => r.json()),
    ])
      .then(([wData, uData]) => {
        if (wData.error) throw new Error(wData.error);
        if (uData.error) throw new Error(uData.error);
        setWorkflows(wData ?? []);
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
    setNom('');
    setDescription('');
    setDialogOpen(true);
  };

  const openEdit = (w: Workflow) => {
    setEditing(w);
    setNom(w.nom);
    setDescription(w.description ?? '');
    setDialogOpen(true);
  };

  const handleSaveWorkflow = async () => {
    if (!nom.trim()) {
      toast.warning('Nom requis');
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/workflows/${editing.id}` : '/api/workflows';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: nom.trim(), description: description.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success(editing ? 'Workflow mis à jour' : 'Workflow créé');
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const openEtapes = (w: Workflow) => {
    setSelectedWorkflow(w);
    setNewEtapeLibelle('');
    setNewEtapeType('SAISIE');
    setNewEtapeUnitId('');
    setEtapesOpen(true);
  };

  const addEtape = async () => {
    if (!selectedWorkflow || !newEtapeLibelle.trim()) {
      toast.warning('Libellé requis');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/workflows/${selectedWorkflow.id}/etapes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          libelle: newEtapeLibelle.trim(),
          type: newEtapeType,
          organisationUnitId: newEtapeUnitId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success('Étape ajoutée');
      setNewEtapeLibelle('');
      setNewEtapeType('SAISIE');
      setNewEtapeUnitId('');
      load();
      setSelectedWorkflow((prev) => (prev ? { ...prev, etapes: [...(prev.etapes ?? []), data] } : null));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const openEditEtape = (e: Etape) => {
    setEditingEtape(e);
    setEditEtapeLibelle(e.libelle);
    setEditEtapeType(e.type);
    setEditEtapeUnitId(e.organisationUnitId ?? '');
    setEditEtapeOrdre(e.ordre);
    setEditEtapeDelaiJours(e.delaiJours ?? '');
  };

  const handleSaveEtape = async () => {
    if (!selectedWorkflow || !editingEtape || !editEtapeLibelle.trim()) {
      toast.warning('Libellé requis');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/workflows/${selectedWorkflow.id}/etapes/${editingEtape.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          libelle: editEtapeLibelle.trim(),
          type: editEtapeType,
          organisationUnitId: editEtapeUnitId || null,
          ordre: editEtapeOrdre,
          delaiJours: editEtapeDelaiJours === '' ? null : editEtapeDelaiJours,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success('Étape modifiée');
      setEditingEtape(null);
      load();
      setSelectedWorkflow((prev) => (prev ? { ...prev, etapes: (prev.etapes ?? []).map((x) => (x.id === editingEtape.id ? data : x)) } : null));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteEtape = (e: Etape) => {
    setEtapeToDelete(e);
    setDeleteEtapeOpen(true);
  };

  const handleDeleteEtape = async () => {
    if (!selectedWorkflow || !etapeToDelete) return;
    setDeletingEtape(true);
    try {
      const res = await fetch(`/api/workflows/${selectedWorkflow.id}/etapes/${etapeToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success('Étape supprimée');
      setDeleteEtapeOpen(false);
      setEtapeToDelete(null);
      load();
      setSelectedWorkflow((prev) => (prev ? { ...prev, etapes: (prev.etapes ?? []).filter((x) => x.id !== etapeToDelete.id) } : null));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setDeletingEtape(false);
    }
  };

  return (
    <>
      <BreadcrumbComp title="Configuration des workflows" items={BCrumb} />
      <CardBox className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h5 className="card-title">Workflows</h5>
          <Button onClick={openCreate}>
            <Icon icon="solar:add-circle-linear" className="mr-2 size-4" />
            Nouveau workflow
          </Button>
        </div>
        {loading ? (
          <p className="text-muted-foreground">Chargement...</p>
        ) : workflows.length === 0 ? (
          <p className="text-muted-foreground">Aucun workflow.</p>
        ) : (
          <div className="space-y-4">
            {workflows.map((w) => (
              <div key={w.id} className="border rounded-lg p-4 hover:bg-muted/50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{w.nom}</p>
                    {w.description && <p className="text-sm text-muted-foreground">{w.description}</p>}
                    {w.etapes?.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Étapes: {w.etapes.map((e) => e.libelle).join(' → ')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEtapes(w)}>
                      Étapes
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(w)}>
                      Modifier
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBox>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le workflow' : 'Nouveau workflow'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Nom</Label>
              <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom du workflow" className="mt-2" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="mt-2" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveWorkflow} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={etapesOpen} onOpenChange={setEtapesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Étapes – {selectedWorkflow?.nom}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(selectedWorkflow?.etapes?.length ?? 0) > 0 && selectedWorkflow && (
              <ul className="text-sm space-y-2">
                {(selectedWorkflow.etapes ?? []).map((e, i) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 py-1 border-b border-muted/50 last:border-0">
                    <span>
                      {i + 1}. {e.libelle} ({e.type})
                      {e.organisationUnit && ` – ${e.organisationUnit.libelle}`}
                      {e.delaiJours != null && ` · ${e.delaiJours} j`}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7" onClick={() => openEditEtape(e)} title="Modifier">
                        <Icon icon="solar:pen-linear" className="size-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive" onClick={() => openDeleteEtape(e)} title="Supprimer">
                        <Icon icon="solar:trash-bin-trash-linear" className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 flex-wrap items-end">
              <div>
                <Label className="text-xs">Libellé</Label>
                <Input value={newEtapeLibelle} onChange={(e) => setNewEtapeLibelle(e.target.value)} placeholder="Nouvelle étape" className="mt-1 w-40" />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={newEtapeType} onValueChange={setNewEtapeType}>
                  <SelectTrigger className="mt-1 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAISIE">Saisie</SelectItem>
                    <SelectItem value="VISA">Visa</SelectItem>
                    <SelectItem value="SIGNATURE">Signature</SelectItem>
                    <SelectItem value="ENVOI">Envoi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Entité</Label>
                <Select value={newEtapeUnitId || 'none'} onValueChange={(v) => setNewEtapeUnitId(v === 'none' ? '' : v)}>
                  <SelectTrigger className="mt-1 w-40">
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
              <Button size="sm" onClick={addEtape} disabled={saving}>Ajouter</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingEtape} onOpenChange={(open) => !open && setEditingEtape(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l&apos;étape</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Libellé</Label>
              <Input value={editEtapeLibelle} onChange={(e) => setEditEtapeLibelle(e.target.value)} placeholder="Libellé" className="mt-2" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={editEtapeType} onValueChange={setEditEtapeType}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAISIE">Saisie</SelectItem>
                  <SelectItem value="VISA">Visa</SelectItem>
                  <SelectItem value="SIGNATURE">Signature</SelectItem>
                  <SelectItem value="ENVOI">Envoi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Entité</Label>
              <Select value={editEtapeUnitId || 'none'} onValueChange={(v) => setEditEtapeUnitId(v === 'none' ? '' : v)}>
                <SelectTrigger className="mt-2">
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ordre</Label>
                <Input type="number" min={1} value={editEtapeOrdre} onChange={(e) => setEditEtapeOrdre(parseInt(e.target.value, 10) || 0)} className="mt-2" />
              </div>
              <div>
                <Label>Délai (jours)</Label>
                <Input type="number" min={0} placeholder="Optionnel" value={editEtapeDelaiJours} onChange={(e) => setEditEtapeDelaiJours(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)} className="mt-2" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEtape(null)}>Annuler</Button>
            <Button onClick={handleSaveEtape} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteEtapeOpen}
        onOpenChange={setDeleteEtapeOpen}
        title="Supprimer l'étape"
        message={etapeToDelete ? `Supprimer l'étape « ${etapeToDelete.libelle} » ?` : ''}
        variant="danger"
        confirmLabel="Supprimer"
        onConfirm={handleDeleteEtape}
        loading={deletingEtape}
      />
    </>
  );
}
