'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import BreadcrumbComp from '@/app/(DashboardLayout)/layout/shared/breadcrumb/BreadcrumbComp';
import CardBox from '@/app/components/shared/CardBox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CourrierDetail {
  id: string;
  numero: string;
  priorite: string;
  dateCourrier: string;
  dateArrivee: string;
  objet: string;
  statut: string;
  expediteur: { id: string; nom: string; email: string | null; telephone?: string | null };
  entiteTraitante: { id: string; libelle: string };
  typologie?: { id: string; libelle: string; parent?: { libelle: string } | null } | null;
  piecesJointes: { id: string; nomFichier: string; cheminStockage: string; principal: boolean; uploadedById: string | null }[];
  documentPrincipalPath: string | null;
  canAct?: boolean;
}

interface AuditLogRow {
  id: string;
  action: string;
  details: unknown;
  createdAt: string;
  user: { name: string | null; email: string } | null;
}

type TimelineItem =
  | { type: 'audit'; id: string; date: string; action: string; user: { name: string | null; email: string }; note?: string; details?: Record<string, unknown> }
  | { type: 'transfert'; id: string; date: string; fromUser: { name: string | null; email: string } | null; toUser: { name: string | null; email: string } | null; toUnit: { libelle: string } | null; note: string | null }
  | { type: 'visa'; id: string; date: string; action: string; etapeWorkflow: string; user: { name: string | null; email: string }; commentaire: string | null }
  | { type: 'visa_reponse'; id: string; date: string; user: { name: string | null; email: string }; statut: string; commentaire: string | null };

interface WorkflowInstance {
  id: string;
  statut: string;
  workflow: { nom: string; etapes: { id: string; libelle: string; type: string; ordre: number }[] };
  etapeActuelle: { id: string; libelle: string } | null;
  historiqueVisas: { id: string; action: string; commentaire: string | null; date: string; user: { name: string | null }; etapeWorkflow: { libelle: string } }[];
}

interface VisaDemandeRow {
  id: string;
  userId: string;
  ordre: number;
  statut: string;
  commentaire: string | null;
  dateReponse: string | null;
  user: { id: string; name: string | null; email: string };
}

interface UnitTreeItem {
  id: string;
  libelle: string;
  parentId: string | null;
  niveau: number;
  ordre: number;
  recipiendaire?: { id: string; email: string; name: string | null } | null;
  children: UnitTreeItem[];
}

function flattenUnits(node: UnitTreeItem): { id: string; libelle: string }[] {
  return [{ id: node.id, libelle: node.libelle }, ...(node.children ?? []).flatMap(flattenUnits)];
}

function findUnitInTree(items: UnitTreeItem[], unitId: string): UnitTreeItem | null {
  for (const item of items) {
    if (item.id === unitId) return item;
    const found = item.children?.length ? findUnitInTree(item.children, unitId) : null;
    if (found) return found;
  }
  return null;
}

function UnitTreeList({
  items,
  level,
  selectedId,
  onSelect,
}: {
  items: UnitTreeItem[];
  level: number;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onSelect(item.id)}
            className={`w-full text-left px-4 py-2 text-sm rounded-md transition-colors hover:bg-primary/10 focus:bg-primary/10 focus:outline-none ${
              selectedId === item.id ? 'bg-primary/15 text-primary font-medium' : ''
            }`}
            style={{ paddingLeft: 12 + level * 20 }}
          >
            <span className="flex items-center gap-2">
              {item.children?.length ? (
                <Icon icon="solar:buildings-2-linear" className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <Icon icon="solar:folder-linear" className="size-4 shrink-0 text-muted-foreground" />
              )}
              {item.libelle}
            </span>
          </button>
          {item.children?.length > 0 && (
            <UnitTreeList items={item.children} level={level + 1} selectedId={selectedId} onSelect={onSelect} />
          )}
        </li>
      ))}
    </ul>
  );
}

export default function CourrierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: session, status } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id ?? undefined;
  const [courrier, setCourrier] = useState<CourrierDetail | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowInstance | null>(null);
  const [workflows, setWorkflows] = useState<{ id: string; nom: string }[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [visaOpen, setVisaOpen] = useState(false);
  const [visaAction, setVisaAction] = useState<'VISE' | 'REFUSE'>('VISE');
  const [commentaire, setCommentaire] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [visaDemandeResponseId, setVisaDemandeResponseId] = useState<string | null>(null);
  const [transferToUnitOpen, setTransferToUnitOpen] = useState(false);
  const [transferToPersonOpen, setTransferToPersonOpen] = useState(false);
  const [visaDemandeOpen, setVisaDemandeOpen] = useState(false);
  const [visaDemandes, setVisaDemandes] = useState<VisaDemandeRow[]>([]);
  const [units, setUnits] = useState<{ id: string; libelle: string }[]>([]);
  const [unitTree, setUnitTree] = useState<UnitTreeItem[]>([]);
  const [users, setUsers] = useState<{
    id: string;
    name: string | null;
    email: string;
    userOrganisationUnits?: { organisationUnit: { id: string; libelle: string } }[];
  }[]>([]);
  const [transferToUnitId, setTransferToUnitId] = useState('');
  const [transferToUserId, setTransferToUserId] = useState('');
  const [transferPersonSearch, setTransferPersonSearch] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [visaDemandeUserIds, setVisaDemandeUserIds] = useState<string[]>([]);
  const [visaDemandeNote, setVisaDemandeNote] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [onlyOfficeOpen, setOnlyOfficeOpen] = useState(false);
  const [onlyOfficeTarget, setOnlyOfficeTarget] = useState<{ pieceId?: string; courrierId?: string } | null>(null);
  const [onlyOfficeConfig, setOnlyOfficeConfig] = useState<Record<string, unknown> | null>(null);
  const [onlyOfficeCreating, setOnlyOfficeCreating] = useState(false);
  const [uploadingProjetReponse, setUploadingProjetReponse] = useState(false);
  const projetReponseInputRef = useRef<HTMLInputElement>(null);
  const [previewPiece, setPreviewPiece] = useState<{ url: string; nomFichier: string } | null>(null);
  const [toDeletePiece, setToDeletePiece] = useState<{ id: string; nomFichier: string } | null>(null);
  const [accuseDialogOpen, setAccuseDialogOpen] = useState(false);
  const [accuseSujet, setAccuseSujet] = useState('');
  const [accuseCorps, setAccuseCorps] = useState('');
  const [accuseSending, setAccuseSending] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [eparapheurOpen, setEparapheurOpen] = useState(false);
  const [eparapheurInclurePrincipal, setEparapheurInclurePrincipal] = useState(false);
  const [eparapheurPieceIds, setEparapheurPieceIds] = useState<string[]>([]);
  const [eparapheurSubmitting, setEparapheurSubmitting] = useState(false);

  const getUserServiceLabel = (u: { userOrganisationUnits?: { organisationUnit: { libelle: string } }[]; email: string }) => {
    const libelles = u.userOrganisationUnits?.map((x) => x.organisationUnit?.libelle).filter(Boolean) ?? [];
    return libelles.length > 0 ? libelles.join(', ') : u.email;
  };

  const refreshBannettesCounts = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('courrier-counts-refresh'));
    }
  };

  const loadVisaDemandes = () => {
    fetch(`/api/courrier/${id}/visa-demande`).then((r) => r.json()).then((data) => {
      if (!data.error) setVisaDemandes(Array.isArray(data) ? data : []);
    });
  };

  useEffect(() => {
    Promise.all([
      fetch(`/api/courrier/${id}`).then((r) => r.json()),
      fetch(`/api/courrier/${id}/workflow`).then((r) => r.json()),
      fetch('/api/workflows').then((r) => r.json()),
      fetch(`/api/courrier/${id}/timeline`).then((r) => r.json()),
      fetch(`/api/courrier/${id}/visa-demande`).then((r) => r.json()),
      fetch('/api/organisation-units').then((r) => r.json()),
      fetch('/api/organisation-units/tree').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
    ])
      .then(([cData, wData, wfList, timelineData, vdData, uData, treeData, usrData]) => {
        if (cData.error) throw new Error(cData.error);
        setCourrier(cData);
        setWorkflow(wData?.id ? wData : null);
        setWorkflows(wfList ?? []);
        setTimeline(Array.isArray(timelineData) ? timelineData : timelineData?.error ? [] : timelineData ?? []);
        setVisaDemandes(Array.isArray(vdData) ? vdData : []);
        setUnits(Array.isArray(uData) ? uData : []);
        setUnitTree(Array.isArray(treeData) ? treeData : treeData?.data ?? []);
        setUsers(Array.isArray(usrData) ? usrData : []);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // OnlyOffice : récupérer la config quand on ouvre l’éditeur
  useEffect(() => {
    if (!onlyOfficeOpen || !onlyOfficeTarget || onlyOfficeConfig) return;
    const pieceId = onlyOfficeTarget.pieceId;
    const courrierId = onlyOfficeTarget.courrierId ?? id;
    const params = pieceId ? `pieceId=${encodeURIComponent(pieceId)}` : `courrierId=${encodeURIComponent(courrierId)}`;
    fetch(`/api/onlyoffice/config?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setOnlyOfficeConfig(data);
      })
      .catch((e) => { toast.error(e.message); setOnlyOfficeOpen(false); setOnlyOfficeTarget(null); });
  }, [onlyOfficeOpen, onlyOfficeTarget, id]);

  // OnlyOffice : charger le script et créer l’éditeur
  useEffect(() => {
    if (!onlyOfficeOpen || !onlyOfficeConfig) return;
    const docServerUrl = (onlyOfficeConfig.documentServerUrl as string)?.replace(/\/$/, '');
    if (!docServerUrl) {
      toast.error('Serveur OnlyOffice non configuré (ONLYOFFICE_SERVER_URL)');
      return;
    }
    const scriptUrl = `${docServerUrl}/web-apps/apps/api/documents/api.js`;
    const existing = document.querySelector(`script[src="${scriptUrl}"]`);
    const configForEditor = { ...onlyOfficeConfig };
    delete (configForEditor as Record<string, unknown>).documentServerUrl;

    const initEditor = () => {
      const DocsAPI = (window as unknown as { DocsAPI?: { DocEditor: new (el: string, cfg: Record<string, unknown>) => void } }).DocsAPI;
      if (!DocsAPI) return;
      const el = document.getElementById('onlyoffice-editor-container');
      if (!el) return;
      el.innerHTML = '';
      try {
        new DocsAPI.DocEditor('onlyoffice-editor-container', configForEditor);
      } catch (err) {
        console.error('OnlyOffice init', err);
        toast.error('Impossible de charger l’éditeur OnlyOffice');
      }
    };

    if (existing) {
      initEditor();
      return;
    }
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.onload = initEditor;
    script.onerror = () => { toast.error('Échec du chargement du script OnlyOffice'); setOnlyOfficeOpen(false); };
    document.head.appendChild(script);
  }, [onlyOfficeOpen, onlyOfficeConfig]);

  const startWorkflow = async (workflowId: string) => {
    try {
      const res = await fetch(`/api/courrier/${id}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', workflowId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success('Circuit démarré');
      refreshBannettesCounts();
      const refetch = await fetch(`/api/courrier/${id}/workflow`);
      const wData = await refetch.json();
      setWorkflow(wData?.id ? wData : null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const submitVisa = async () => {
    setSubmitting(true);
    try {
      if (visaDemandeResponseId) {
        const res = await fetch(`/api/visa-demande/${visaDemandeResponseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ statut: visaAction, commentaire: commentaire.trim() || null }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Erreur');
        toast.success(visaAction === 'VISE' ? 'Avis envoyé (visé)' : 'Avis refusé');
        refreshBannettesCounts();
        setVisaOpen(false);
        setVisaDemandeResponseId(null);
        setCommentaire('');
        fetch(`/api/courrier/${id}`).then((r) => r.json()).then(setCourrier);
        loadVisaDemandes();
        fetch(`/api/courrier/${id}/timeline`).then((r) => r.json()).then((d) => setTimeline(Array.isArray(d) ? d : []));
      } else {
        const res = await fetch(`/api/courrier/${id}/workflow`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'visa',
            visaAction: visaAction,
            commentaire: commentaire.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Erreur');
        toast.success(visaAction === 'VISE' ? 'Courrier visé' : 'Visa refusé');
        refreshBannettesCounts();
        setVisaOpen(false);
        setCommentaire('');
        fetch(`/api/courrier/${id}`).then((r) => r.json()).then(setCourrier);
        fetch(`/api/courrier/${id}/workflow`).then((r) => r.json()).then(setWorkflow);
        fetch(`/api/courrier/${id}/timeline`).then((r) => r.json()).then((d) => setTimeline(Array.isArray(d) ? d : []));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const submitTransfer = async () => {
    if (!transferToUnitId && !transferToUserId) {
      toast.warning('Choisissez un service ou une personne');
      return;
    }
    setActionSubmitting(true);
    try {
      const res = await fetch(`/api/courrier/${id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUnitId: transferToUnitId || null,
          toUserId: transferToUserId || null,
          note: transferNote.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success('Courrier transféré');
      refreshBannettesCounts();
      setTransferToUnitOpen(false);
      setTransferToPersonOpen(false);
      setTransferToUnitId('');
      setTransferToUserId('');
      setTransferNote('');
      // Rediriger vers la banette « À traiter » : le courrier disparaît et on affiche le suivant
      router.push('/courrier/mes-banettes?view=a_traiter');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setActionSubmitting(false);
    }
  };

  const submitVisaDemande = async () => {
    if (visaDemandeUserIds.length === 0) {
      toast.warning('Sélectionnez au moins une personne');
      return;
    }
    setActionSubmitting(true);
    try {
      const res = await fetch(`/api/courrier/${id}/visa-demande`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: visaDemandeUserIds, note: visaDemandeNote.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success('Demande(s) de visa envoyée(s)');
      refreshBannettesCounts();
      setVisaDemandeOpen(false);
      setVisaDemandeUserIds([]);
      setVisaDemandeNote('');
      fetch(`/api/courrier/${id}`).then((r) => r.json()).then(setCourrier);
      loadVisaDemandes();
      fetch(`/api/courrier/${id}/timeline`).then((r) => r.json()).then((d) => setTimeline(Array.isArray(d) ? d : []));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setActionSubmitting(false);
    }
  };

  const submitEparapheur = async () => {
    if (!eparapheurInclurePrincipal && eparapheurPieceIds.length === 0) {
      toast.warning('Sélectionnez au moins un document');
      return;
    }
    setEparapheurSubmitting(true);
    try {
      const res = await fetch(`/api/courrier/${id}/eparapheur/envoi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inclureDocumentPrincipal: eparapheurInclurePrincipal,
          pieceJointeIds: eparapheurPieceIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      toast.success('Envoi à l\'éparapheur effectué');
      refreshBannettesCounts();
      setEparapheurOpen(false);
      setEparapheurInclurePrincipal(false);
      setEparapheurPieceIds([]);
      fetch(`/api/courrier/${id}/timeline`).then((r) => r.json()).then((d) => setTimeline(Array.isArray(d) ? d : []));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setEparapheurSubmitting(false);
    }
  };

  const formatActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      enregistrement: 'Enregistrement',
      transfert: 'Transfert',
      workflow_start: 'Démarrage du circuit',
      visa_demande: 'Demande de visa',
      visa_etape: 'Visa (étape)',
      visa_termine: 'Circuit terminé (visé)',
      visa_refuse: 'Visa refusé',
      eparapheur_envoi: 'Envoyé à l\'éparapheur',
      eparapheur_valide: 'Éparapheur — Document validé',
      eparapheur_rejete: 'Éparapheur — Document rejeté',
    };
    return labels[action] ?? action;
  };

  const getUserLabel = (u: { name: string | null; email: string } | null) => u?.name ?? u?.email ?? 'Système';

  const getTransferUserLabel = (u: { name: string | null; email: string } | null) => {
    if (!u) return '—';
    const name = u.name ?? u.email ?? '—';
    const found = users.find((x) => x.email === u.email);
    if (!found) return name;
    const service = getUserServiceLabel(found);
    if (!service || service === found.email) return name;
    return `${name} (${service})`;
  };

  if (loading || !courrier) {
    return (
      <>
        <BreadcrumbComp title="Détail du courrier" items={[{ to: '/', title: 'Accueil' }, { to: '/courrier', title: 'Courrier' }, { title: 'Détail' }]} />
        <p className="text-muted-foreground">Chargement...</p>
      </>
    );
  }

  const BCrumb = [{ to: '/', title: 'Accueil' }, { to: '/courrier', title: 'Courrier' }, { title: courrier.numero }];

  const prioriteBadgeClass = (p: string) =>
    p === 'URGENT'
      ? 'bg-destructive/15 text-destructive'
      : p === 'HAUTE'
        ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
        : p === 'BASSE'
          ? 'bg-muted text-muted-foreground'
          : 'bg-primary/15 text-primary';
  const statutLabel = (s: string) =>
    ({ ENREGISTRE: 'Enregistré', EN_TRAITEMENT: 'En traitement', CLOTURE: 'Clôturé', ANNULE: 'Annulé' }[s] ?? s);

  const docPath = courrier.documentPrincipalPath?.replace(/\\/g, '/');
  const docUrl = docPath ? `/api/files/${docPath}` : null;
  const isPdf = docPath?.toLowerCase().endsWith('.pdf');
  const isImage = docPath && /\.(jpg|jpeg|png|gif|webp)$/i.test(docPath);
  const canAct = courrier.canAct ?? false;

  return (
    <>
      <BreadcrumbComp title={`Courrier ${courrier.numero}`} items={BCrumb} />
      {!canAct && (
        <p className="mb-4 text-sm text-muted-foreground rounded-lg bg-muted/50 px-4 py-2 flex items-center gap-2">
          <Icon icon="solar:eye-linear" className="size-4 shrink-0" />
          Vous pouvez uniquement consulter ce courrier.
        </p>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr] gap-6">
        {/* Bloc 1 : Informations — compact */}
        <CardBox className="p-4 border rounded-xl shadow-sm bg-card lg:max-w-[360px]">
          <div className="flex items-center justify-between mb-3 pb-3 border-b">
            <h5 className="text-base font-semibold flex items-center gap-1.5">
              <Icon icon="solar:info-circle-linear" className="size-4 text-primary" />
              Informations
            </h5>
            <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{courrier.numero}</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/30">
              <Icon icon="solar:flag-linear" className="size-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Priorité</span>
                <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${prioriteBadgeClass(courrier.priorite)}`}>{courrier.priorite}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/30">
              <Icon icon="solar:checklist-linear" className="size-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Statut</span>
                <span className="text-xs font-medium">{statutLabel(courrier.statut)}</span>
              </div>
            </div>
            <div className="py-1.5 px-2 rounded-md bg-muted/30">
              <p className="text-xs text-muted-foreground mb-0.5">Objet</p>
              <p className="text-xs font-medium break-words leading-snug">{courrier.objet}</p>
            </div>
            <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/30">
              <Icon icon="solar:calendar-linear" className="size-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1 flex justify-between gap-2 text-xs">
                <span className="text-muted-foreground">Date courrier</span>
                <span>{format(new Date(courrier.dateCourrier), 'dd/MM/yyyy', { locale: fr })}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/30">
              <Icon icon="solar:calendar-mark-linear" className="size-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1 flex justify-between gap-2 text-xs">
                <span className="text-muted-foreground">Date arrivée</span>
                <span>{format(new Date(courrier.dateArrivee), 'dd/MM/yyyy', { locale: fr })}</span>
              </div>
            </div>
            <div className="py-1.5 px-2 rounded-md bg-muted/30">
              <p className="text-xs text-muted-foreground mb-0.5">Expéditeur</p>
              <p className="text-xs font-medium truncate" title={courrier.expediteur?.nom}>{courrier.expediteur?.nom}</p>
              {courrier.expediteur?.email && (
                <a href={`mailto:${courrier.expediteur.email}`} className="text-xs text-primary hover:underline truncate block">{courrier.expediteur.email}</a>
              )}
            </div>
            <div className="py-1.5 px-2 rounded-md bg-muted/30">
              <p className="text-xs text-muted-foreground mb-0.5">Entité traitante</p>
              <p className="text-xs font-medium truncate" title={courrier.entiteTraitante?.libelle}>{courrier.entiteTraitante?.libelle}</p>
            </div>
            {courrier.typologie && (
              <div className="py-1.5 px-2 rounded-md bg-muted/30 space-y-0.5">
                {courrier.typologie.parent?.libelle ? (
                  <>
                    <p className="text-xs text-muted-foreground">Catégorie</p>
                    <p className="text-xs font-semibold">{courrier.typologie.parent.libelle}</p>
                    <p className="text-xs text-muted-foreground mt-1">Sous-catégorie</p>
                    <p className="text-xs font-medium">{courrier.typologie.libelle}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">Typologie</p>
                    <p className="text-xs font-medium">{courrier.typologie.libelle}</p>
                  </>
                )}
              </div>
            )}
            {/* Notifications : accusés de réception (dropdown Mail / WhatsApp) */}
            <div className="py-1.5 px-2 rounded-md bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Icon icon="solar:bell-linear" className="size-3.5" />
                Notifications
              </p>
              {canAct ? (
              <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 text-xs justify-between"
                  >
                    <span>Envoyer un accusé de réception</span>
                    <Icon icon="solar:alt-arrow-down-linear" className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  <DropdownMenuItem
                    disabled={!courrier.expediteur?.email}
                    onClick={() => {
                      if (!courrier.expediteur?.email) return;
                      const dateReception = format(new Date(courrier.dateArrivee), 'dd/MM/yyyy', { locale: fr });
                      const nomService = courrier.entiteTraitante?.libelle ?? '[nom du service]';
                      const currentUser = currentUserId ? users.find((u) => u.id === currentUserId) : null;
                      const userName = (session?.user as { name?: string | null } | undefined)?.name ?? currentUser?.name ?? '[Nom]';
                      const userService = currentUser ? getUserServiceLabel(currentUser) : '[Service]';
                      const userEmail = (session?.user as { email?: string | null } | undefined)?.email ?? currentUser?.email ?? '[email]';
                      setAccuseSujet(`Accusé de réception - Courrier ${courrier.numero}`);
                      setAccuseCorps(
                        '<p>Madame, Monsieur,</p>' +
                        '<p>Nous accusons réception de votre courrier reçu en date du <strong>' + dateReception + '</strong>, relatif à :<br>« ' + (courrier.objet ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + ' ».</p>' +
                        '<p>Votre correspondance a été enregistrée sous la référence : <strong>' + courrier.numero + '</strong> et a été transmise au service compétent pour traitement conformément aux procédures en vigueur.</p>' +
                        '<p>Nous vous remercions pour votre démarche et vous prions d\'agréer, Madame, Monsieur, l\'expression de nos salutations distinguées.</p>' +
                        '<p>Pour le Service ' + nomService.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '<br>Mairie de Bafoussam</p>' +
                        '<p>' + (userName || '[Nom]').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '<br>' + (userService || '[Service]').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '<br>Email : ' + (userEmail || '[email]').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>'
                      );
                      setAccuseDialogOpen(true);
                    }}
                    className="gap-2 cursor-pointer"
                  >
                    <Icon icon="solar:letter-linear" className="size-4" />
                    Mail
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!courrier.expediteur?.telephone || sendingWhatsApp}
                    onClick={async (e) => {
                      e.preventDefault();
                      if (!id || !courrier.expediteur?.telephone) return;
                      setSendingWhatsApp(true);
                      try {
                        const res = await fetch(`/api/courrier/${id}/accuse-reception-whatsapp`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({}),
                        });
                        const data = await res.json();
                        if (data.error) throw new Error(data.error);
                        toast.success('Accusé de réception envoyé par WhatsApp.');
                        refreshBannettesCounts();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'envoi WhatsApp.');
                      } finally {
                        setSendingWhatsApp(false);
                      }
                    }}
                    className="gap-2 cursor-pointer"
                  >
                    {sendingWhatsApp ? (
                      <Icon icon="solar:refresh-linear" className="size-4 animate-spin" />
                    ) : (
                      <Icon icon="logos:whatsapp-icon" className="size-4" />
                    )}
                    WhatsApp
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {!courrier.expediteur?.email && !courrier.expediteur?.telephone && (
                <p className="text-xs text-muted-foreground mt-1.5">Aucun email ni téléphone pour l&apos;expéditeur.</p>
              )}
              </>
              ) : (
                <p className="text-xs text-muted-foreground mt-1.5">Réservé au destinataire du courrier.</p>
              )}
            </div>
          </div>
        </CardBox>

        {/* Bloc 2 : Aperçu du courrier — agrandi */}
        <CardBox className="p-6 flex flex-col min-h-[520px] lg:min-h-[calc(100vh-12rem)] border rounded-xl shadow-sm bg-card">
          <h5 className="text-lg font-semibold mb-4 flex items-center gap-2 shrink-0">
            <Icon icon="solar:document-linear" className="size-5 text-primary" />
            Aperçu du courrier
          </h5>
          {!docUrl ? (
            <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 text-muted-foreground min-h-[400px]">
              <div className="text-center p-8">
                <Icon icon="solar:document-add-linear" className="size-14 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Aucun document principal</p>
                <p className="text-xs mt-1">Les pièces jointes sont listées plus bas.</p>
              </div>
            </div>
          ) : isPdf ? (
            <div className="flex-1 min-h-0 rounded-xl border border-border overflow-hidden bg-muted/10 flex flex-col">
              <iframe
                src={`${docUrl}#toolbar=1`}
                title="Aperçu du courrier (PDF)"
                className="w-full flex-1 min-h-[480px] border-0"
              />
            </div>
          ) : isImage ? (
            <div className="flex-1 min-h-0 rounded-xl border border-border overflow-hidden bg-muted/10 flex items-center justify-center p-2 min-h-[400px]">
              <img src={docUrl} alt="Aperçu du courrier" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed bg-muted/20 text-muted-foreground">
              <div className="text-center p-8">
                <Icon icon="solar:document-linear" className="size-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Prévisualisation non disponible pour ce type de fichier.</p>
                <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm mt-2 inline-flex items-center gap-1 hover:underline">
                  <Icon icon="solar:download-linear" className="size-4" />
                  Télécharger le document
                </a>
              </div>
            </div>
          )}
        </CardBox>

        {/* Pièces jointes + OnlyOffice */}
        <CardBox className="p-6 lg:col-span-2" id="documents">
          <h5 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Icon icon="solar:folder-with-files-linear" className="size-5 text-primary" />
            Pièces jointes
          </h5>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input
              ref={projetReponseInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={async (e) => {
                const input = e.target;
                const file = input.files?.[0];
                if (!file || !id) return;
                setUploadingProjetReponse(true);
                try {
                  const form = new FormData();
                  form.append('file', file);
                  form.append('courrierId', id);
                  form.append('principal', 'false');
                  const res = await fetch('/api/upload', { method: 'POST', body: form });
                  const data = await res.json();
                  if (data.error) throw new Error(data.error);
                  const piece = data.piece ?? data;
                  if (courrier) {
                    setCourrier({
                      ...courrier,
                      piecesJointes: [...(courrier.piecesJointes ?? []), { id: piece.id, nomFichier: piece.nomFichier, cheminStockage: piece.cheminStockage, principal: false, uploadedById: piece.uploadedById ?? null }],
                    });
                  }
                  toast.success('Projet de réponse ajouté.');
                  refreshBannettesCounts();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'upload.');
                } finally {
                  setUploadingProjetReponse(false);
                  input.value = '';
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={uploadingProjetReponse || onlyOfficeCreating}
              onClick={() => projetReponseInputRef.current?.click()}
            >
              {uploadingProjetReponse ? (
                <Icon icon="solar:refresh-linear" className="size-4 animate-spin" />
              ) : (
                <Icon icon="solar:upload-linear" className="size-4" />
              )}
              Envoyer un projet de réponse (PDF ou Word)
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-2"
              disabled={onlyOfficeCreating}
              onClick={async () => {
                if (!id) return;
                setOnlyOfficeCreating(true);
                try {
                  const res = await fetch(`/api/courrier/${id}/piece-jointe-onlyoffice`, { method: 'POST' });
                  const data = await res.json();
                  if (data.error) throw new Error(data.error);
                  const piece = data.piece ?? data;
                  setOnlyOfficeConfig(null);
                  setOnlyOfficeTarget({ pieceId: piece.id });
                  setOnlyOfficeOpen(true);
                  if (courrier) {
                    setCourrier({
                      ...courrier,
                      piecesJointes: [...(courrier.piecesJointes ?? []), { id: piece.id, nomFichier: piece.nomFichier, cheminStockage: piece.cheminStockage, principal: false, uploadedById: piece.uploadedById ?? null }],
                    });
                  }
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Erreur');
                } finally {
                  setOnlyOfficeCreating(false);
                }
              }}
            >
              {onlyOfficeCreating ? (
                <Icon icon="solar:refresh-linear" className="size-4 animate-spin" />
              ) : (
                <Icon icon="solar:document-add-linear" className="size-4" />
              )}
              Créer une pièce jointe avec OnlyOffice
            </Button>
          </div>
          {(!courrier?.piecesJointes || courrier.piecesJointes.length === 0) ? (
            <p className="text-sm text-muted-foreground">Aucune pièce jointe. Envoyez un projet de réponse (PDF ou Word), créez un document avec OnlyOffice ou ajoutez des fichiers à l&apos;enregistrement du courrier.</p>
          ) : (
            <ul className="space-y-2">
              {courrier.piecesJointes.map((p) => {
                const pathNorm = p.cheminStockage?.replace(/\\/g, '/');
                const fileUrl = pathNorm ? `/api/files/${pathNorm}` : null;
                const isEditable = /\.(docx?|xlsx?|txt)$/i.test(p.nomFichier ?? '');
                const isPreviewable = /\.(pdf|jpe?g|png|gif|webp)$/i.test(p.nomFichier ?? '');
                const canEditOrDelete = currentUserId != null && (p.uploadedById == null || String(p.uploadedById) === String(currentUserId));
                const canDelete = currentUserId != null && p.uploadedById != null && String(p.uploadedById) === String(currentUserId);
                return (
                  <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <Icon icon="solar:document-linear" className="size-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{p.nomFichier}</span>
                      {p.principal && <span className="text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded">Principal</span>}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {fileUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewPiece({ url: fileUrl, nomFichier: p.nomFichier ?? 'Pièce jointe' })}
                          title="Aperçu"
                        >
                          <Icon icon="solar:eye-linear" className="size-4" />
                        </Button>
                      )}
                      {canEditOrDelete && isEditable && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => { setOnlyOfficeConfig(null); setOnlyOfficeTarget({ pieceId: p.id }); setOnlyOfficeOpen(true); }}
                        >
                          <Icon icon="solar:pen-linear" className="size-4" />
                          OnlyOffice
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <a href={fileUrl ?? '#'} target="_blank" rel="noopener noreferrer" title="Télécharger">
                          <Icon icon="solar:download-linear" className="size-4" />
                        </a>
                      </Button>
                      {canDelete && !p.principal && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setToDeletePiece({ id: p.id, nomFichier: p.nomFichier ?? 'cette pièce' })}
                          title="Supprimer"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Icon icon="solar:trash-bin-trash-linear" className="size-4" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBox>

        <Dialog open={accuseDialogOpen} onOpenChange={setAccuseDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Envoyer un accusé de réception par mail à l&apos;expéditeur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto">
              <div>
                <Label className="text-muted-foreground">Destinataire</Label>
                <p className="text-sm font-medium mt-1">{courrier?.expediteur?.nom} &lt;{courrier?.expediteur?.email}&gt;</p>
              </div>
              <div>
                <Label htmlFor="accuse-sujet">Objet du mail</Label>
                <Input
                  id="accuse-sujet"
                  value={accuseSujet}
                  onChange={(e) => setAccuseSujet(e.target.value)}
                  placeholder="Accusé de réception - Courrier..."
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Message (texte riche)</Label>
                <RichTextEditor
                  key={accuseDialogOpen ? 'open' : 'closed'}
                  value={accuseCorps}
                  onChange={setAccuseCorps}
                  placeholder="Rédigez le corps du mail..."
                  className="mt-1.5"
                  minHeight="280px"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setAccuseDialogOpen(false)} disabled={accuseSending}>
                Annuler
              </Button>
              <Button
                type="button"
                disabled={accuseSending || !id}
                onClick={async () => {
                  if (!id) return;
                  setAccuseSending(true);
                  try {
                    const res = await fetch(`/api/courrier/${id}/accuse-reception`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        type: 'accuse_standard',
                        modeEnvoi: 'email',
                        destinataire: courrier?.expediteur?.email ?? undefined,
                        sujet: accuseSujet || undefined,
                        corpsMessage: accuseCorps || undefined,
                      }),
                    });
                    const data = await res.json();
                    if (data.error) throw new Error(data.error);
                    setAccuseDialogOpen(false);
                    toast.success(data.emailSent ? 'Accusé de réception envoyé par mail.' : 'Accusé de réception enregistré (envoi mail non configuré).');
                    refreshBannettesCounts();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Erreur lors de l\'envoi.');
                  } finally {
                    setAccuseSending(false);
                  }
                }}
              >
                {accuseSending ? (
                  <>
                    <Icon icon="solar:refresh-linear" className="size-4 animate-spin mr-2" />
                    Envoi…
                  </>
                ) : (
                  <>
                    <Icon icon="solar:letter-linear" className="size-4 mr-2" />
                    Envoyer l&apos;accusé par mail
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={!!toDeletePiece}
          onOpenChange={(open) => !open && setToDeletePiece(null)}
          title="Supprimer la pièce jointe"
          message={toDeletePiece ? `Supprimer « ${toDeletePiece.nomFichier } » ? Cette action est irréversible.` : ''}
          variant="danger"
          confirmLabel="Supprimer"
          onConfirm={async () => {
            if (!toDeletePiece || !id) return;
            const res = await fetch(`/api/courrier/${id}/piece-jointe/${toDeletePiece.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            if (courrier) {
              const wasPrincipal = courrier.piecesJointes?.find((x) => x.id === toDeletePiece.id)?.principal;
              setCourrier({
                ...courrier,
                piecesJointes: (courrier.piecesJointes ?? []).filter((x) => x.id !== toDeletePiece.id),
                documentPrincipalPath: wasPrincipal ? null : courrier.documentPrincipalPath,
              });
            }
            setToDeletePiece(null);
            setPreviewPiece(null);
            toast.success('Pièce jointe supprimée.');
            refreshBannettesCounts();
          }}
        />

        <Dialog open={!!previewPiece} onOpenChange={(open) => !open && setPreviewPiece(null)}>
          <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col p-0">
            <DialogHeader className="px-6 py-3 border-b shrink-0">
              <DialogTitle className="text-base font-medium truncate pr-8">
                {previewPiece?.nomFichier ?? 'Aperçu'}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
              {previewPiece && (() => {
                const ext = (previewPiece.nomFichier ?? '').split('.').pop()?.toLowerCase();
                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext ?? '');
                const isPdf = ext === 'pdf';
                if (isImage) {
                  return (
                    <div className="flex-1 flex items-center justify-center p-6 bg-muted/20">
                      <img
                        src={previewPiece.url}
                        alt={previewPiece.nomFichier}
                        className="max-w-full max-h-full object-contain rounded"
                      />
                    </div>
                  );
                }
                if (isPdf) {
                  return (
                    <iframe
                      src={previewPiece.url}
                      title={previewPiece.nomFichier}
                      className="flex-1 w-full min-h-0 border-0 bg-white"
                    />
                  );
                }
                return (
                  <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Ce type de fichier ne peut pas être prévisualisé ici.
                      </p>
                      <Button asChild variant="outline">
                        <a href={previewPiece.url} target="_blank" rel="noopener noreferrer">
                          <Icon icon="solar:download-linear" className="size-4 mr-2" />
                          Ouvrir dans un nouvel onglet
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>

        {visaDemandes.length > 0 && (
          <CardBox className="p-6 lg:col-span-2">
            <h5 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <Icon icon="solar:document-text-linear" className="size-5 text-primary" />
              Demandes d&apos;avis / visa
            </h5>
            <p className="text-sm text-muted-foreground mb-4">
              Liste des personnes sollicitées pour un avis (visa) sur ce courrier et statut de leur réponse.
            </p>
            {(() => {
              const uid = currentUserId != null ? String(currentUserId).trim() : '';
              const sessionEmail = (session?.user as { email?: string | null })?.email?.trim?.();
              const myDemande = visaDemandes.find(
                (d) =>
                  d.statut === 'EN_ATTENTE' &&
                  (uid ? String(d.userId).trim() === uid : !!sessionEmail && (d.user?.email ?? '').trim().toLowerCase() === sessionEmail.toLowerCase())
              ) ?? null;
              const hasEnAttente = visaDemandes.some((d) => d.statut === 'EN_ATTENTE');
              return (
                <>
                  {myDemande && (
                    <div className="mb-5 p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-wrap items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
                        <Icon icon="solar:bell-linear" className="size-5 text-primary" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">Votre avis est demandé</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Émettez votre visa ou refusez en ajoutant éventuellement un commentaire.</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => { setVisaDemandeResponseId(myDemande.id); setVisaAction('VISE'); setCommentaire(''); setVisaOpen(true); }}
                        >
                          <Icon icon="solar:verified-check-linear" className="size-4" />
                          Viser
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => { setVisaDemandeResponseId(myDemande.id); setVisaAction('REFUSE'); setCommentaire(''); setVisaOpen(true); }}
                        >
                          <Icon icon="solar:close-circle-linear" className="size-4" />
                          Refuser
                        </Button>
                      </div>
                    </div>
                  )}
                  {hasEnAttente && !myDemande && status === 'authenticated' && (
                    <p className="text-xs text-muted-foreground mb-3 rounded-lg bg-muted/50 px-3 py-2">
                      Les avis en attente concernent d&apos;autres comptes. Connectez-vous avec le compte concerné pour donner votre avis.
                    </p>
                  )}
                  {hasEnAttente && !myDemande && status === 'unauthenticated' && (
                    <p className="text-xs text-muted-foreground mb-3 rounded-lg bg-amber-500/10 px-3 py-2">
                      Connectez-vous pour pouvoir donner votre avis si une demande vous a été adressée.
                    </p>
                  )}
                  <div className="space-y-3">
                    {visaDemandes.map((d) => {
                      const isMine = !!myDemande && myDemande.id === d.id;
                      return (
                        <div
                          key={d.id}
                          className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 ${isMine ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium">
                            {(d.user?.name || d.user?.email || '?').charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{d.user?.name ?? d.user?.email ?? '—'}</p>
                            {d.commentaire && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2" title={d.commentaire}>
                                {d.commentaire}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            {d.statut === 'EN_ATTENTE' && isMine && (
                              <div className="flex gap-1.5">
                                <Button
                                  size="sm"
                                  className="gap-1 h-8"
                                  onClick={() => { setVisaDemandeResponseId(d.id); setVisaAction('VISE'); setCommentaire(''); setVisaOpen(true); }}
                                >
                                  <Icon icon="solar:verified-check-linear" className="size-3.5" />
                                  Viser
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 h-8"
                                  onClick={() => { setVisaDemandeResponseId(d.id); setVisaAction('REFUSE'); setCommentaire(''); setVisaOpen(true); }}
                                >
                                  <Icon icon="solar:close-circle-linear" className="size-3.5" />
                                  Refuser
                                </Button>
                              </div>
                            )}
                            {d.dateReponse && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(new Date(d.dateReponse), 'dd/MM/yyyy HH:mm', { locale: fr })}
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                                d.statut === 'EN_ATTENTE'
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                                  : d.statut === 'VISE'
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-destructive/15 text-destructive'
                              }`}
                            >
                              {d.statut === 'EN_ATTENTE' ? 'En attente' : d.statut === 'VISE' ? 'Visé' : 'Refusé'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </CardBox>
        )}
      </div>
      {timeline.length > 0 && (
        <CardBox className="p-6 mt-6">
          <h5 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <Icon icon="solar:history-linear" className="size-5 text-primary" />
            Historique / Traçabilité
          </h5>
          <p className="text-sm text-muted-foreground mb-4">
            Actions, transferts, visas, notes et réponses sur ce courrier.
          </p>
          <ul className="space-y-0">
            {timeline.map((item) => (
              <li key={`${item.type}-${item.id}`} className="border-b border-border py-4 last:border-0 last:pb-0 first:pt-0 first:border-t-0">
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    {item.type === 'audit' && (
                      <Icon
                        icon={
                          (item as { action?: string }).action?.startsWith('eparapheur')
                            ? 'solar:tablet-linear'
                            : 'solar:document-text-linear'
                        }
                        className="size-4"
                      />
                    )}
                    {item.type === 'transfert' && <Icon icon="solar:forward-linear" className="size-4" />}
                    {item.type === 'visa' && (item.action === 'VISE' ? <Icon icon="solar:verified-check-linear" className="size-4" /> : <Icon icon="solar:close-circle-linear" className="size-4" />)}
                    {item.type === 'visa_reponse' && (item.statut === 'VISE' ? <Icon icon="solar:verified-check-linear" className="size-4" /> : item.statut === 'REFUSE' ? <Icon icon="solar:close-circle-linear" className="size-4" /> : <Icon icon="solar:clock-circle-linear" className="size-4" />)}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                      {item.type === 'audit' && (
                        <>
                          <span className="font-medium text-foreground">{formatActionLabel(item.action)}</span>
                          <span className="text-muted-foreground">
                            {item.action === 'visa_demande' ? ' par ' + getTransferUserLabel(item.user) : ' par ' + getUserLabel(item.user)}
                          </span>
                        </>
                      )}
                      {item.type === 'transfert' && (
                        <>
                          <span className="font-medium text-foreground">Transfert</span>
                          <span className="text-muted-foreground">
                            {item.fromUser ? getTransferUserLabel(item.fromUser) : '—'}
                            {' → '}
                            {item.toUser ? getTransferUserLabel(item.toUser) : item.toUnit?.libelle ?? '—'}
                          </span>
                        </>
                      )}
                      {item.type === 'visa' && (
                        <>
                          <span className="font-medium text-foreground">{item.action === 'VISE' ? 'Visa (visé)' : 'Visa refusé'}</span>
                          <span className="text-muted-foreground">{item.etapeWorkflow} — par {getUserLabel(item.user)}</span>
                        </>
                      )}
                      {item.type === 'visa_reponse' && (
                        <>
                          <span className="font-medium text-foreground">
                            Réponse demande de visa — {item.statut === 'VISE' ? 'Visé' : item.statut === 'REFUSE' ? 'Refusé' : 'En attente'}
                          </span>
                          <span className="text-muted-foreground">par {getTransferUserLabel(item.user)}</span>
                        </>
                      )}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(item.date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </span>
                    </div>
                    {(item.type === 'audit' && item.note) && (
                      <p className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3 italic mt-1.5">{item.note}</p>
                    )}
                    {(item.type === 'audit' &&
                      ((item as { action?: string }).action === 'eparapheur_valide' || (item as { action?: string }).action === 'eparapheur_rejete') &&
                      (item.details as { cheminDocumentAnnote?: string } | undefined)?.cheminDocumentAnnote) && (
                      <p className="text-sm mt-1.5">
                        <a
                          href={`/api/files/${(item.details as { cheminDocumentAnnote: string }).cheminDocumentAnnote.replace(/\\/g, '/')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline"
                        >
                          <Icon icon="solar:download-linear" className="size-4" />
                          Télécharger le document annoté
                        </a>
                      </p>
                    )}
                    {(item.type === 'transfert' && item.note) && (
                      <p className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3 italic mt-1.5">{item.note}</p>
                    )}
                    {(item.type === 'visa' && item.commentaire) && (
                      <p className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3 italic mt-1.5">{item.commentaire}</p>
                    )}
                    {(item.type === 'visa_reponse' && item.commentaire) && (
                      <p className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3 italic mt-1.5">{item.commentaire}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardBox>
      )}
      <div className="mt-6 flex gap-2">
        <Button variant="outline" asChild>
          <Link href="/courrier">Retour à la liste</Link>
        </Button>
      </div>

      {/* FAB — menu Actions (visible uniquement si destinataire) */}
      {canAct && (
      <div className="fixed bottom-6 right-6 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-primary text-primary-foreground hover:bg-primary/90"
              aria-label="Actions"
            >
              <Icon icon="solar:menu-dots-linear" className="size-7" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56 mb-2">
            <DropdownMenuItem onClick={() => setTransferToUnitOpen(true)} className="gap-2 cursor-pointer">
              <Icon icon="solar:buildings-2-linear" className="size-4" />
              Transférer à un service
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTransferToPersonOpen(true)} className="gap-2 cursor-pointer">
              <Icon icon="solar:user-linear" className="size-4" />
              Transférer à une personne
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setVisaDemandeOpen(true)} className="gap-2 cursor-pointer">
              <Icon icon="solar:document-text-linear" className="size-4" />
              Envoyer pour visa
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEparapheurOpen(true)} className="gap-2 cursor-pointer">
              <Icon icon="solar:tablet-linear" className="size-4" />
              Envoyer dans l&apos;éparapheur
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      )}

      {/* Transférer à un service — organigramme hiérarchique */}
      <Dialog open={transferToUnitOpen} onOpenChange={(open) => { setTransferToUnitOpen(open); if (!open) setTransferToUnitId(''); if (open) setTransferToUserId(''); }}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon icon="solar:buildings-2-linear" className="size-5 text-primary" />
              Transférer à un service
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Choisissez un service dans l&apos;organigramme. Le courrier sera transféré à cette unité.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service</Label>
              <div className="mt-2 border rounded-lg overflow-auto py-2 max-h-[280px] bg-muted/20">
                {unitTree.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-4 py-6 text-center">Chargement de l&apos;organigramme…</p>
                ) : (
                  <UnitTreeList
                    items={unitTree}
                    level={0}
                    selectedId={transferToUnitId}
                    onSelect={(unitId) => setTransferToUnitId(unitId)}
                  />
                )}
              </div>
              {transferToUnitId && (() => {
                const selectedUnit = findUnitInTree(unitTree, transferToUnitId);
                const libelle = selectedUnit?.libelle ?? transferToUnitId;
                const destinataire = selectedUnit?.recipiendaire?.name?.trim() || selectedUnit?.recipiendaire?.email;
                return (
                  <p className="mt-2 text-xs text-muted-foreground rounded-md bg-primary/5 px-2 py-1.5">
                    Sélection : <strong className="text-foreground">{libelle}</strong>
                    {destinataire && <span className="text-foreground"> ({destinataire})</span>}
                  </p>
                );
              })()}
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Note (optionnel)</Label>
              <Textarea
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                placeholder="Ex : Pour instruction et retour sous 48 h."
                className="mt-2 min-h-0 resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setTransferToUnitOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => { submitTransfer(); }} disabled={actionSubmitting || !transferToUnitId} className="gap-2">
              {actionSubmitting ? (
                <>
                  <Icon icon="solar:refresh-linear" className="size-4 animate-spin" />
                  Envoi…
                </>
              ) : (
                <>
                  <Icon icon="solar:send-linear" className="size-4" />
                  Transférer au service
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Envoyer dans l'éparapheur */}
      <Dialog
        open={eparapheurOpen}
        onOpenChange={(open) => {
          setEparapheurOpen(open);
          if (!open) {
            setEparapheurInclurePrincipal(false);
            setEparapheurPieceIds([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon icon="solar:tablet-linear" className="size-5 text-primary" />
              Envoyer dans l&apos;éparapheur
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Choisissez le ou les documents à envoyer à la tablette (éparapheur) pour signature / annotations.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documents</Label>
              <div className="mt-2 space-y-2 max-h-[280px] overflow-y-auto border rounded-lg p-3 bg-muted/20">
                {courrier && (() => {
                  const hasPrincipal = !!courrier.documentPrincipalPath || courrier.piecesJointes?.some((p) => p.principal);
                  const principalPiece = courrier.piecesJointes?.find((p) => p.principal);
                  const otherPieces = courrier.piecesJointes?.filter((p) => !p.principal) ?? [];
                  return (
                    <>
                      {hasPrincipal && (
                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-muted/50">
                          <Checkbox
                            checked={eparapheurInclurePrincipal}
                            onCheckedChange={(c) => setEparapheurInclurePrincipal(!!c)}
                          />
                          <span className="text-sm font-medium">
                            Document principal
                            {principalPiece && ` — ${principalPiece.nomFichier}`}
                          </span>
                        </label>
                      )}
                      {otherPieces.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-muted/50">
                          <Checkbox
                            checked={eparapheurPieceIds.includes(p.id)}
                            onCheckedChange={(c) => {
                              setEparapheurPieceIds((prev) => (c ? [...prev, p.id] : prev.filter((id) => id !== p.id)));
                            }}
                          />
                          <span className="text-sm truncate">{p.nomFichier}</span>
                        </label>
                      ))}
                      {(!courrier.piecesJointes || courrier.piecesJointes.length === 0) && !courrier.documentPrincipalPath && (
                        <p className="text-sm text-muted-foreground py-2">Aucun document disponible.</p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEparapheurOpen(false)}>Annuler</Button>
            <Button
              onClick={submitEparapheur}
              disabled={eparapheurSubmitting || (!eparapheurInclurePrincipal && eparapheurPieceIds.length === 0)}
              className="gap-2"
            >
              {eparapheurSubmitting ? (
                <>
                  <Icon icon="solar:refresh-linear" className="size-4 animate-spin" />
                  Envoi…
                </>
              ) : (
                <>
                  <Icon icon="solar:send-linear" className="size-4" />
                  Envoyer à l&apos;éparapheur
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transférer à une personne */}
      <Dialog open={transferToPersonOpen} onOpenChange={(open) => { setTransferToPersonOpen(open); if (!open) { setTransferToUserId(''); setTransferPersonSearch(''); } if (open) setTransferToUnitId(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon icon="solar:user-linear" className="size-5 text-primary" />
              Transférer à une personne
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Transférer ce courrier à un collaborateur qui en prendra la charge.
            </p>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destinataire</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">Saisissez au moins 3 lettres pour afficher les noms et choisir la personne.</p>
              {!transferToUserId ? (
                <>
                  <div className="relative mt-2">
                    <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      value={transferPersonSearch}
                      onChange={(e) => setTransferPersonSearch(e.target.value)}
                      placeholder="Ex. Dupont, Jean…"
                      className="pl-9 w-full"
                      autoComplete="off"
                    />
                  </div>
                  {transferPersonSearch.trim().length >= 3 && (
                    <div className="mt-2 border rounded-md max-h-[220px] overflow-y-auto bg-card">
                      {(() => {
                        const q = transferPersonSearch.trim().toLowerCase();
                        const filtered = users.filter(
                          (u) =>
                            (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
                        );
                        if (filtered.length === 0) {
                          return (
                            <p className="py-4 px-3 text-sm text-muted-foreground text-center">
                              Aucune personne trouvée.
                            </p>
                          );
                        }
                        return (
                          <ul className="py-1">
                            {filtered.map((u) => (
                              <li key={u.id}>
                                <button
                                  type="button"
                                  onClick={() => { setTransferToUserId(u.id); setTransferPersonSearch(''); }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-primary/10 focus:bg-primary/10 focus:outline-none rounded-sm"
                                >
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-medium">
                                    {(u.name || u.email || '?').charAt(0).toUpperCase()}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium truncate">{u.name || '—'}</p>
                                    <p className="text-xs text-muted-foreground truncate">{getUserServiceLabel(u)}</p>
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        );
                      })()}
                    </div>
                  )}
                  {transferPersonSearch.trim().length > 0 && transferPersonSearch.trim().length < 3 && (
                    <p className="mt-1.5 text-xs text-muted-foreground">Saisir au moins 3 caractères pour afficher les noms.</p>
                  )}
                </>
              ) : (() => {
                const u = users.find((x) => x.id === transferToUserId);
                return u ? (
                  <div className="mt-2 flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-medium">
                      {(u.name || u.email || '?').charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{u.name || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{getUserServiceLabel(u)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={() => { setTransferToUserId(''); setTransferPersonSearch(''); }}
                    >
                      Changer
                    </Button>
                  </div>
                ) : null;
              })()}
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Note (optionnel)</Label>
              <Textarea
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                placeholder="Ex : Pour instruction et retour."
                className="mt-2 min-h-0 resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setTransferToPersonOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => { submitTransfer(); }}
              disabled={actionSubmitting || !transferToUserId}
              className="gap-2"
            >
              {actionSubmitting ? (
                <>
                  <Icon icon="solar:refresh-linear" className="size-4 animate-spin" />
                  Envoi…
                </>
              ) : (
                <>
                  <Icon icon="solar:send-linear" className="size-4" />
                  Transférer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Éditeur OnlyOffice */}
      <Dialog
        open={onlyOfficeOpen}
        onOpenChange={(open) => {
          setOnlyOfficeOpen(open);
          if (!open) setOnlyOfficeTarget(null);
          if (!open) setOnlyOfficeConfig(null);
        }}
      >
        <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Icon icon="solar:document-text-linear" className="size-5 text-primary" />
              Édition avec OnlyOffice
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Fermez la fenêtre après avoir enregistré. Les modifications sont sauvegardées automatiquement.</p>
          </DialogHeader>
          <div className="flex-1 min-h-0 px-6 pb-6">
            {onlyOfficeConfig ? (
              <div id="onlyoffice-editor-container" className="w-full h-full min-h-[500px] rounded-lg border bg-muted/10" />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground">
                <Icon icon="solar:refresh-linear" className="size-8 animate-spin mr-2" />
                Chargement de l’éditeur…
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={visaDemandeOpen} onOpenChange={setVisaDemandeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon icon="solar:document-text-linear" className="size-5 text-primary" />
              Envoyer pour visa
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Demander l&apos;avis (visa) d&apos;une ou plusieurs personnes sur ce courrier.
            </p>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destinataires</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">Ajoutez les personnes qui devront émettre leur avis.</p>
              <Select
                value="none"
                onValueChange={(v) => {
                  if (v !== 'none' && !visaDemandeUserIds.includes(v)) setVisaDemandeUserIds([...visaDemandeUserIds, v]);
                }}
              >
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue placeholder="Choisir une personne…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Choisir —</SelectItem>
                  {users.filter((u) => !visaDemandeUserIds.includes(u.id)).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name ? `${u.name} (${getUserServiceLabel(u)})` : getUserServiceLabel(u)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {visaDemandeUserIds.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed bg-muted/20 py-6 text-center">
                  <Icon icon="solar:user-plus-linear" className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Aucun destinataire sélectionné</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Utilisez la liste ci-dessus pour ajouter des personnes.</p>
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {visaDemandeUserIds.map((uid, index) => {
                    const u = users.find((x) => x.id === uid);
                    return u ? (
                      <li key={uid} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-medium">
                          {(u.name || u.email || '?').charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{u.name || '—'}</p>
                          <p className="text-xs text-muted-foreground truncate">{getUserServiceLabel(u)}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">#{index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setVisaDemandeUserIds((ids) => ids.filter((i) => i !== uid))}
                          aria-label="Retirer"
                        >
                          <Icon icon="solar:trash-bin-trash-linear" className="size-4" />
                        </Button>
                      </li>
                    ) : null;
                  })}
                </ul>
              )}
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Note ou instruction (optionnel)</Label>
              <Textarea
                value={visaDemandeNote}
                onChange={(e) => setVisaDemandeNote(e.target.value)}
                placeholder="Ex : Merci de viser pour approbation avant le 15/02."
                className="mt-2 min-h-0 resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setVisaDemandeOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={submitVisaDemande}
              disabled={actionSubmitting || visaDemandeUserIds.length === 0}
              className="gap-2"
            >
              {actionSubmitting ? (
                <>
                  <Icon icon="solar:refresh-linear" className="size-4 animate-spin" />
                  Envoi…
                </>
              ) : (
                <>
                  <Icon icon="solar:send-linear" className="size-4" />
                  Envoyer pour visa {visaDemandeUserIds.length > 0 && `(${visaDemandeUserIds.length})`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {visaOpen && visaDemandeResponseId && (
        <Dialog open={visaOpen} onOpenChange={(open) => { setVisaOpen(open); if (!open) setVisaDemandeResponseId(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {visaAction === 'VISE' ? (
                  <Icon icon="solar:verified-check-linear" className="size-5 text-primary" />
                ) : (
                  <Icon icon="solar:close-circle-linear" className="size-5 text-destructive" />
                )}
                {visaAction === 'VISE' ? 'Émettre votre avis (visé)' : 'Refuser l\'avis'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {visaAction === 'VISE'
                  ? 'Vous validez ce courrier. Un commentaire optionnel sera enregistré dans l\'historique.'
                  : 'Vous refusez le visa. Vous pouvez indiquer la raison (optionnel).'}
              </p>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Commentaire (optionnel)</Label>
                <Textarea
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder={visaAction === 'VISE' ? 'Ex. Vu pour approbation, bon pour exécution.' : 'Ex. À revoir / à corriger avant visa.'}
                  className="mt-2 min-h-0 resize-none"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setVisaOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={submitVisa}
                disabled={submitting}
                variant={visaAction === 'REFUSE' ? 'destructive' : 'default'}
                className="gap-2"
              >
                {submitting ? (
                  <>
                    <Icon icon="solar:refresh-linear" className="size-4 animate-spin" />
                    Envoi…
                  </>
                ) : visaAction === 'VISE' ? (
                  <>
                    <Icon icon="solar:verified-check-linear" className="size-4" />
                    Viser
                  </>
                ) : (
                  <>
                    <Icon icon="solar:close-circle-linear" className="size-4" />
                    Refuser
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {visaOpen && !visaDemandeResponseId && (
        <ConfirmDialog
          open={visaOpen}
          onOpenChange={setVisaOpen}
          title={visaAction === 'VISE' ? 'Confirmer le visa' : 'Refuser le visa'}
          message={visaAction === 'VISE' ? 'Êtes-vous sûr de viser ce courrier ?' : 'Êtes-vous sûr de refuser le visa ?'}
          variant={visaAction === 'VISE' ? 'success' : 'danger'}
          confirmLabel={visaAction === 'VISE' ? 'Viser' : 'Refuser'}
          onConfirm={submitVisa}
        />
      )}
    </>
  );
}
