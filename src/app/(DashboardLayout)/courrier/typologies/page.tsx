'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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

const BCrumb = [{ to: '/', title: 'Accueil' }, { to: '/courrier', title: 'Courrier' }, { title: 'Typologies courrier' }];

interface TypologieNode {
  id: string;
  libelle: string;
  parentId: string | null;
  ordre: number;
  actif: boolean;
  children: TypologieNode[];
}

function TypologieTreeNode({
  node,
  onAddChild,
  onEdit,
  onDelete,
}: {
  node: TypologieNode;
  onAddChild: (parent: TypologieNode) => void;
  onEdit: (n: TypologieNode) => void;
  onDelete: (n: TypologieNode) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isNiveau1 = node.parentId === null;

  return (
    <div className="pl-4 border-l border-muted">
      <div className="flex items-center gap-2 py-1.5 group flex-wrap">
        {hasChildren && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="p-0.5 shrink-0">
            <Icon icon={open ? 'solar:minus-circle-linear' : 'solar:add-circle-linear'} className="size-4" />
          </button>
        )}
        {!hasChildren && <span className="w-5 shrink-0" />}
        <span className="font-medium break-words min-w-0">{node.libelle}</span>
        <span className="text-xs text-muted-foreground">
          (niveau {isNiveau1 ? 1 : 2} · ordre {node.ordre})
        </span>
        {node.actif ? (
          <span className="text-xs text-success">Actif</span>
        ) : (
          <span className="text-xs text-muted-foreground">Inactif</span>
        )}
        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
          {isNiveau1 && (
            <Button variant="ghost" size="sm" className="h-7" onClick={() => onAddChild(node)} title="Ajouter un niveau 2">
              <Icon icon="solar:add-circle-linear" className="size-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7" onClick={() => onEdit(node)} title="Modifier">
            <Icon icon="solar:pen-linear" className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(node)}
            title="Supprimer">
            <Icon icon="solar:trash-bin-trash-linear" className="size-4" />
          </Button>
        </div>
      </div>
      {open && hasChildren && (
        <div className="space-y-0">
          {node.children!.map((child) => (
            <TypologieTreeNode key={child.id} node={child} onAddChild={onAddChild} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TypologiesPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === 'admin';
  const [tree, setTree] = useState<TypologieNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TypologieNode | null>(null);
  const [parentIdForCreate, setParentIdForCreate] = useState<string | null>(null);
  const [form, setForm] = useState({ libelle: '', parentId: '' as string | null, ordre: 0, actif: true });
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<TypologieNode | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    fetch('/api/typologie-courrier?actif=false')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTree(Array.isArray(data) ? data : []);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const roots = tree;

  const openCreateNiveau1 = () => {
    setEditing(null);
    setParentIdForCreate(null);
    setForm({ libelle: '', parentId: null, ordre: roots.length, actif: true });
    setDialogOpen(true);
  };

  const openCreateNiveau2 = (parent: TypologieNode) => {
    setEditing(null);
    setParentIdForCreate(parent.id);
    setForm({ libelle: '', parentId: parent.id, ordre: parent.children?.length ?? 0, actif: true });
    setDialogOpen(true);
  };

  const openEdit = (node: TypologieNode) => {
    setEditing(node);
    setParentIdForCreate(null);
    setForm({
      libelle: node.libelle,
      parentId: node.parentId ?? null,
      ordre: node.ordre,
      actif: node.actif,
    });
    setDialogOpen(true);
  };

  const openDelete = (node: TypologieNode) => {
    setToDelete(node);
    setDeleteOpen(true);
  };

  const handleSave = async () => {
    if (!form.libelle.trim()) {
      toast.warning('Libellé requis');
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/typologie-courrier/${editing.id}` : '/api/typologie-courrier';
      const method = editing ? 'PATCH' : 'POST';
      const body = editing
        ? { libelle: form.libelle.trim(), parentId: form.parentId || null, ordre: form.ordre, actif: form.actif }
        : { libelle: form.libelle.trim(), parentId: parentIdForCreate ?? form.parentId ?? null, ordre: form.ordre, actif: form.actif };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success(editing ? 'Typologie mise à jour' : 'Typologie créée');
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
    setDeleting(true);
    try {
      const res = await fetch(`/api/typologie-courrier/${toDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success('Typologie supprimée');
      setDeleteOpen(false);
      setToDelete(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setDeleting(false);
    }
  };

  if (!isAdmin) {
    return (
      <>
        <BreadcrumbComp title="Typologies courrier" items={BCrumb} />
        <CardBox className="p-6">
          <p className="text-muted-foreground">Accès réservé aux administrateurs.</p>
        </CardBox>
      </>
    );
  }

  return (
    <>
      <BreadcrumbComp title="Typologies courrier" items={BCrumb} />
      <CardBox className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h5 className="card-title">Typologies de courrier</h5>
          <Button onClick={openCreateNiveau1}>
            <Icon icon="solar:add-circle-linear" className="mr-2 size-4" />
            Racine
          </Button>
        </div>
        {loading ? (
          <p className="text-muted-foreground">Chargement...</p>
        ) : roots.length === 0 ? (
          <p className="text-muted-foreground">Aucune typologie. Ajoutez une racine.</p>
        ) : (
          <div className="space-y-0">
            {roots.map((node) => (
              <TypologieTreeNode
                key={node.id}
                node={node}
                onAddChild={openCreateNiveau2}
                onEdit={openEdit}
                onDelete={openDelete}
              />
            ))}
          </div>
        )}
      </CardBox>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon icon={editing ? 'solar:pen-linear' : 'solar:add-circle-linear'} className="size-5 text-primary" />
              {editing ? 'Modifier la typologie' : parentIdForCreate ? 'Nouvelle typologie (niveau 2)' : 'Nouvelle typologie (niveau 1)'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {editing
                ? 'Modifiez le libellé, l\'ordre et l\'état actif de cette typologie.'
                : parentIdForCreate
                  ? 'Créez une typologie de niveau 2 (ex. Lettre, Email) sous le parent sélectionné.'
                  : 'Créez une typologie de niveau 1 (ex. Courrier entrant, Courrier sortant).'}
            </p>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Libellé</Label>
              <Input
                value={form.libelle}
                onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))}
                placeholder="Ex. Courrier entrant, Lettre…"
                className="mt-2"
              />
            </div>
            {editing && editing.parentId && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Typologie actuelle :</span> niveau 2 · ordre {editing.ordre}
              </div>
            )}
            {(!parentIdForCreate && (editing?.parentId ?? form.parentId)) || (editing && editing.parentId) ? (
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Parent (niveau 1)</Label>
                <Select
                  value={form.parentId ?? 'none'}
                  onValueChange={(v) => setForm((f) => ({ ...f, parentId: v === 'none' ? null : v }))}
                >
                  <SelectTrigger className="mt-2 w-full">
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {roots.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.libelle}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {parentIdForCreate && !editing && (
              <p className="text-xs text-muted-foreground">Sera enregistrée sous le parent sélectionné.</p>
            )}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ordre</Label>
              <Input
                type="number"
                value={form.ordre}
                onChange={(e) => setForm((f) => ({ ...f, ordre: parseInt(e.target.value, 10) || 0 }))}
                className="mt-2 w-24"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.actif} onCheckedChange={(v) => setForm((f) => ({ ...f, actif: v }))} />
              <Label className="text-sm font-normal cursor-pointer">Actif</Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Les typologies actives apparaissent dans la liste « Typologie du courrier » à l&apos;enregistrement d&apos;un courrier.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer la typologie"
        message={
          toDelete
            ? `Supprimer la typologie « ${toDelete.libelle} » ? Cette action est irréversible si aucun courrier ne l'utilise.`
            : ''
        }
        variant="danger"
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
