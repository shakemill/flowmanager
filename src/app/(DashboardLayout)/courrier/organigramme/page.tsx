'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import BreadcrumbComp from '@/app/(DashboardLayout)/layout/shared/breadcrumb/BreadcrumbComp';
import CardBox from '@/app/components/shared/CardBox';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/lib/toast';

const BCrumb = [{ to: '/', title: 'Accueil' }, { to: '/courrier', title: 'Courrier' }, { title: 'Organigramme' }];

interface Recipiendaire {
  id: string;
  email: string;
  name: string | null;
}

interface OrganisationUnit {
  id: string;
  libelle: string;
  parentId: string | null;
  niveau: number;
  ordre: number;
  entiteTraitante?: boolean;
  recipiendaire?: Recipiendaire | null;
  children?: OrganisationUnit[];
}

function TreeNode({
  unit,
  onAddChild,
  onEdit,
  onDelete,
}: {
  unit: OrganisationUnit;
  onAddChild: (parentId: string) => void;
  onEdit: (u: OrganisationUnit) => void;
  onDelete: (u: OrganisationUnit) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = unit.children && unit.children.length > 0;

  return (
    <div className="pl-4 border-l border-muted">
      <div className="flex items-center gap-2 py-1.5 group">
        {hasChildren && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="p-0.5">
            <Icon icon={open ? 'solar:minus-circle-linear' : 'solar:add-circle-linear'} className="size-4" />
          </button>
        )}
        {!hasChildren && <span className="w-5" />}
        <span className="font-medium">{unit.libelle}</span>
        <span className="text-xs text-muted-foreground">(niveau {unit.niveau})</span>
        {unit.entiteTraitante !== false && (
          <Icon
            icon="solar:document-text-linear"
            className="size-4 text-muted-foreground"
            title="Affichée comme entité traitante à l'enregistrement du courrier"
          />
        )}
        {unit.recipiendaire && (
          <span className="text-xs text-primary flex items-center gap-1" title="Récipiendaire du courrier">
            <Icon icon="solar:user-linear" className="size-3.5" />
            {unit.recipiendaire.name || unit.recipiendaire.email}
          </span>
        )}
        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
          <Button variant="ghost" size="sm" className="h-7" onClick={() => onAddChild(unit.id)} title="Ajouter une sous-unité">
            <Icon icon="solar:add-circle-linear" className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7" onClick={() => onEdit(unit)} title="Modifier">
            <Icon icon="solar:pen-linear" className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive" onClick={() => onDelete(unit)} title="Supprimer l'unité">
            <Icon icon="solar:trash-bin-trash-linear" className="size-4" />
          </Button>
        </div>
      </div>
      {open && hasChildren && (
        <div className="space-y-0">
          {unit.children!.map((child) => (
            <TreeNode key={child.id} unit={child} onAddChild={onAddChild} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrganigrammePage() {
  const router = useRouter();
  const [tree, setTree] = useState<OrganisationUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<OrganisationUnit | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    fetch('/api/organisation-units/tree')
      .then((r) => r.json())
      .then((treeData) => {
        if (treeData.error) throw new Error(treeData.error);
        setTree(treeData ?? []);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const goToCreate = (parentIdArg: string | null) => {
    const url = parentIdArg
      ? `/courrier/organigramme/nouveau?parentId=${encodeURIComponent(parentIdArg)}`
      : '/courrier/organigramme/nouveau';
    router.push(url);
  };

  const goToEdit = (u: OrganisationUnit) => {
    router.push(`/courrier/organigramme/${u.id}`);
  };

  const openDelete = (u: OrganisationUnit) => {
    setUnitToDelete(u);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!unitToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/organisation-units/${unitToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success('Unité supprimée');
      setDeleteOpen(false);
      setUnitToDelete(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <BreadcrumbComp title="Organigramme" items={BCrumb} />
      <CardBox className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h5 className="card-title">Organisation hiérarchique</h5>
          <Button asChild>
            <Link href="/courrier/organigramme/nouveau">
              <Icon icon="solar:add-circle-linear" className="mr-2 size-4" />
              Racine
            </Link>
          </Button>
        </div>
        {loading ? (
          <p className="text-muted-foreground">Chargement...</p>
        ) : tree.length === 0 ? (
          <p className="text-muted-foreground">Aucune unité. Ajoutez une racine.</p>
        ) : (
          <div className="space-y-0">
            {tree.map((unit) => (
              <TreeNode key={unit.id} unit={unit} onAddChild={goToCreate} onEdit={goToEdit} onDelete={openDelete} />
            ))}
          </div>
        )}
      </CardBox>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer l'unité"
        message={
          unitToDelete
            ? `Supprimer l'unité « ${unitToDelete.libelle} » ? Cette action est irréversible. Les unités ayant des sous-unités ne peuvent pas être supprimées.`
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
