'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const BCrumb = [{ to: '/', title: 'Accueil' }, { to: '/courrier', title: 'Courrier' }, { title: 'Enregistrement' }];

type Priorite = 'BASSE' | 'NORMAL' | 'HAUTE' | 'URGENT';
type ContactType = 'PERSONNE' | 'SOCIETE';

interface Contact {
  id: string;
  nom: string;
  type: ContactType;
  raisonSociale?: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
}

interface OrganisationUnit {
  id: string;
  libelle: string;
  parentId: string | null;
  niveau: number;
  ordre: number;
  entiteTraitante?: boolean;
  children?: OrganisationUnit[];
}

interface FilePreview {
  file: File;
  url: string;
  name: string;
  type: string;
  size: number;
}

function flattenUnits(units: OrganisationUnit[], level = 0): { id: string; libelle: string; level: number; entiteTraitante: boolean }[] {
  const result: { id: string; libelle: string; level: number; entiteTraitante: boolean }[] = [];
  for (const u of units) {
    result.push({ id: u.id, libelle: u.libelle, level, entiteTraitante: u.entiteTraitante !== false });
    if (u.children?.length) result.push(...flattenUnits(u.children, level + 1));
  }
  return result;
}

function canEnregistrer(session: { user?: { role?: string; roles?: string[] } } | null): boolean {
  if (!session?.user) return false;
  const role = session.user.role;
  const roles = session.user.roles ?? [];
  return role === 'admin' || roles.includes('enregistrement_courrier');
}

export default function EnregistrementCourrierPage() {
  const { data: session, status } = useSession();
  const [priorite, setPriorite] = useState<Priorite>('NORMAL');
  const [dateCourrier, setDateCourrier] = useState<Date>(new Date());
  const [dateArrivee, setDateArrivee] = useState<Date>(new Date());
  const [objet, setObjet] = useState('');
  const [expediteurId, setExpediteurId] = useState<string | null>(null);
  const [expediteurSearch, setExpediteurSearch] = useState('');
  const [entiteTraitanteId, setEntiteTraitanteId] = useState<string | null>(null);
  const [typologieId, setTypologieId] = useState<string | null>(null);
  const [typologieTree, setTypologieTree] = useState<{ id: string; libelle: string; parentId: string | null; ordre: number; actif: boolean; children: { id: string; libelle: string }[] }[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [organisationTree, setOrganisationTree] = useState<OrganisationUnit[]>([]);
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [principalIndex, setPrincipalIndex] = useState<number>(0);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [docxLoading, setDocxLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contactPopOpen, setContactPopOpen] = useState(false);
  const [newContact, setNewContact] = useState({ nom: '', type: 'PERSONNE' as ContactType, raisonSociale: '', email: '', telephone: '', adresse: '' });
  const [creatingContact, setCreatingContact] = useState(false);
  const [expediteurDropdownOpen, setExpediteurDropdownOpen] = useState(false);
  const [expediteurSearchResults, setExpediteurSearchResults] = useState<Contact[]>([]);
  const [expediteurSearchLoading, setExpediteurSearchLoading] = useState(false);
  const [selectedExpediteurData, setSelectedExpediteurData] = useState<Contact | null>(null);
  const expediteurInputRef = useRef<HTMLDivElement>(null);
  const expediteurSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadContacts = useCallback(async () => {
    try {
      const res = await fetch('/api/contacts');
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch {
      toast.error('Erreur chargement des contacts');
    }
  }, []);

  const loadOrganisationTree = useCallback(async () => {
    try {
      const res = await fetch('/api/organisation-units/tree');
      if (res.ok) {
        const data = await res.json();
        setOrganisationTree(data);
      }
    } catch {
      toast.error('Erreur chargement de l\'organigramme');
    }
  }, []);

  useEffect(() => {
    loadContacts();
    loadOrganisationTree();
  }, [loadContacts, loadOrganisationTree]);

  useEffect(() => {
    fetch('/api/typologie-courrier')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error && Array.isArray(data)) setTypologieTree(data);
      })
      .catch(() => {});
  }, []);

  const searchTrim = expediteurSearch.trim();
  const canShowSearch = searchTrim.length >= 3;

  useEffect(() => {
    if (!canShowSearch) {
      setExpediteurSearchResults([]);
      return;
    }
    if (expediteurSearchDebounceRef.current) clearTimeout(expediteurSearchDebounceRef.current);
    expediteurSearchDebounceRef.current = setTimeout(async () => {
      setExpediteurSearchLoading(true);
      try {
        const res = await fetch(`/api/contacts?q=${encodeURIComponent(searchTrim)}`);
        if (res.ok) {
          const data = await res.json();
          setExpediteurSearchResults(Array.isArray(data) ? data : []);
        } else {
          setExpediteurSearchResults([]);
        }
      } catch {
        setExpediteurSearchResults([]);
      } finally {
        setExpediteurSearchLoading(false);
      }
    }, 300);
    return () => {
      if (expediteurSearchDebounceRef.current) clearTimeout(expediteurSearchDebounceRef.current);
    };
  }, [searchTrim, canShowSearch]);

  const selectedExpediteur = selectedExpediteurData ?? contacts.find((c) => c.id === expediteurId) ?? null;
  const showDropdown = expediteurDropdownOpen && !selectedExpediteur;
  const hasMatches = expediteurSearchResults.length > 0;
  const canCreateNew = canShowSearch;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (expediteurInputRef.current && !expediteurInputRef.current.contains(e.target as Node)) {
        setExpediteurDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unitsFlat = flattenUnits(organisationTree).filter((u) => u.entiteTraitante);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const newPreviews: FilePreview[] = selected.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      type: file.type,
      size: file.size,
    }));
    setFiles((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return newPreviews;
    });
    if (selected.length) setPrincipalIndex(0);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index].url);
      setPrincipalIndex((p) => (p >= next.length ? Math.max(0, next.length - 1) : p === index ? 0 : p > index ? p - 1 : p));
      return next;
    });
  };

  const openCreateContact = (nomPreFill = '') => {
    setNewContact((prev) => ({ ...prev, nom: nomPreFill || prev.nom }));
    setContactPopOpen(true);
    setExpediteurDropdownOpen(false);
  };

  const handleCreateContact = async () => {
    if (!newContact.nom.trim()) {
      toast.warning('Nom du contact requis');
      return;
    }
    setCreatingContact(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: newContact.nom,
          type: newContact.type,
          raisonSociale: newContact.type === 'SOCIETE' ? newContact.raisonSociale : undefined,
          email: newContact.email || undefined,
          telephone: newContact.telephone || undefined,
          adresse: newContact.adresse || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      await loadContacts();
      setExpediteurId(data.id);
      setSelectedExpediteurData({
        id: data.id,
        nom: data.nom ?? newContact.nom,
        type: data.type ?? newContact.type,
        raisonSociale: (data.raisonSociale ?? newContact.raisonSociale) || null,
        email: (data.email ?? newContact.email) || null,
        telephone: (data.telephone ?? newContact.telephone) || null,
        adresse: (data.adresse ?? newContact.adresse) || null,
      });
      setContactPopOpen(false);
      setNewContact({ nom: '', type: 'PERSONNE', raisonSociale: '', email: '', telephone: '', adresse: '' });
      setExpediteurSearch('');
      toast.success('Contact créé');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur création contact');
    } finally {
      setCreatingContact(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objet.trim()) {
      toast.warning('Objet du courrier requis');
      return;
    }
    if (!typologieId) {
      toast.warning('Veuillez sélectionner un type de courrier');
      return;
    }
    if (!expediteurId) {
      toast.warning('Veuillez sélectionner ou créer un expéditeur');
      return;
    }
    if (!entiteTraitanteId) {
      toast.warning('Veuillez sélectionner une entité traitante');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/courrier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priorite,
          dateCourrier: dateCourrier.toISOString(),
          dateArrivee: dateArrivee.toISOString(),
          objet: objet.trim(),
          expediteurId,
          entiteTraitanteId,
          typologieId: typologieId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur création courrier');
      const courrierId = data.id;

      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const formData = new FormData();
          formData.append('file', files[i].file);
          formData.append('courrierId', courrierId);
          formData.append('principal', i === principalIndex ? 'true' : 'false');
          formData.append('ordre', String(i));
          const upRes = await fetch('/api/upload', { method: 'POST', body: formData });
          if (!upRes.ok) {
            const errData = await upRes.json();
            throw new Error(errData.error ?? 'Erreur upload');
          }
        }
      }

      toast.success('Courrier enregistré', `Numéro: ${data.numero}`);
      setObjet('');
      setExpediteurId(null);
      setSelectedExpediteurData(null);
      setEntiteTraitanteId(null);
      setTypologieId(null);
      setFiles((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url));
        return [];
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const principalFile = files[principalIndex];
  const previewPdfUrl = principalFile?.type === 'application/pdf' ? principalFile.url : null;

  if (status !== 'loading' && !canEnregistrer(session)) {
    return (
      <>
        <BreadcrumbComp title="Enregistrement du courrier" items={BCrumb} />
        <CardBox className="p-8 text-center">
          <span className="flex items-center justify-center size-16 rounded-full bg-muted text-muted-foreground mx-auto mb-4">
            <Icon icon="solar:lock-linear" className="size-8" />
          </span>
          <h3 className="font-semibold text-lg text-foreground">Accès réservé</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Vous n&apos;avez pas le droit d&apos;enregistrer un courrier. Ce droit est attribué au service courrier.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/courrier">Retour à la liste du courrier</Link>
          </Button>
        </CardBox>
      </>
    );
  }
  const previewImageUrl = principalFile?.type.startsWith('image/') ? principalFile.url : null;
  const isDocx =
    principalFile?.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const isDocOld = principalFile?.type === 'application/msword';

  useEffect(() => {
    if (!principalFile || !isDocx) {
      setDocxHtml(null);
      return;
    }
    let cancelled = false;
    setDocxLoading(true);
    setDocxHtml(null);
    (async () => {
      try {
        const mammoth = (await import('mammoth')).default;
        const arrayBuffer = await principalFile.file.arrayBuffer();
        const { value } = await mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled) {
          setDocxHtml(value);
        }
      } catch {
        if (!cancelled) setDocxHtml(null);
      } finally {
        if (!cancelled) setDocxLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [principalFile, isDocx]);

  return (
    <>
      <BreadcrumbComp title="Enregistrement du courrier" items={BCrumb} />
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardBox className="p-6">
            <h5 className="card-title mb-4">Informations du courrier</h5>
            <div className="space-y-4">
              <div>
                <Label>Priorité</Label>
                <Select value={priorite} onValueChange={(v) => setPriorite(v as Priorite)}>
                  <SelectTrigger className="mt-2 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BASSE">Basse</SelectItem>
                    <SelectItem value="NORMAL">Normale</SelectItem>
                    <SelectItem value="HAUTE">Haute</SelectItem>
                    <SelectItem value="URGENT">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type de courrier <span className="text-destructive">*</span></Label>
                <Select value={typologieId ?? ''} onValueChange={(v) => setTypologieId(v || null)} required>
                  <SelectTrigger className="mt-2 w-full">
                    <SelectValue placeholder="Choisir un type de courrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {typologieTree.map((parent) => (
                      <SelectGroup key={parent.id}>
                        <SelectLabel className="font-semibold">{parent.libelle}</SelectLabel>
                        {(parent.children ?? []).map((child) => (
                          <SelectItem key={child.id} value={child.id} className="pl-6">
                            {child.libelle}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Catégorie du courrier.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Date du courrier</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('mt-2 w-full justify-start text-left font-normal')}>
                        <Icon icon="solar:calendar-linear" className="mr-2 size-4" />
                        {format(dateCourrier, 'PPP', { locale: fr })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={dateCourrier} onSelect={(d) => d && setDateCourrier(d)} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Date d&apos;arrivée</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('mt-2 w-full justify-start text-left font-normal')}>
                        <Icon icon="solar:calendar-linear" className="mr-2 size-4" />
                        {format(dateArrivee, 'PPP', { locale: fr })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={dateArrivee} onSelect={(d) => d && setDateArrivee(d)} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <Label>Objet du courrier</Label>
                <Input
                  className="mt-2 w-full"
                  value={objet}
                  onChange={(e) => setObjet(e.target.value)}
                  placeholder="Objet du courrier"
                  required
                />
              </div>
              <div ref={expediteurInputRef} className="relative">
                <Label>Expéditeur</Label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  Saisir les 3 premières lettres pour rechercher un contact existant, ou créer un nouveau.
                </p>
                {selectedExpediteur ? (
                  <div className="mt-2 flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Icon icon="solar:user-linear" className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{selectedExpediteur.nom}</p>
                      {selectedExpediteur.type === 'SOCIETE' && selectedExpediteur.raisonSociale && (
                        <p className="text-xs text-muted-foreground">Raison sociale : {selectedExpediteur.raisonSociale}</p>
                      )}
                      {selectedExpediteur.email && (
                        <p className="text-sm text-muted-foreground">{selectedExpediteur.email}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setExpediteurId(null);
                        setSelectedExpediteurData(null);
                        setExpediteurSearch('');
                        setExpediteurDropdownOpen(true);
                      }}
                    >
                      Changer
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Min. 3 lettres pour rechercher..."
                        value={expediteurSearch}
                        onChange={(e) => {
                          setExpediteurSearch(e.target.value);
                          setExpediteurDropdownOpen(true);
                        }}
                        onFocus={() => setExpediteurDropdownOpen(true)}
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" onClick={() => openCreateContact()} title="Créer un nouveau contact">
                        <Icon icon="solar:user-plus-linear" className="size-4" />
                      </Button>
                    </div>
                    {showDropdown && canCreateNew && (
                      <div className="absolute z-50 mt-1 w-full min-w-[280px] rounded-lg border bg-popover py-1 shadow-md">
                        {expediteurSearchLoading ? (
                          <div className="px-3 py-4 text-center text-sm text-muted-foreground">Recherche en cours...</div>
                        ) : hasMatches ? (
                          <ul className="max-h-48 overflow-auto py-1">
                            {expediteurSearchResults.map((c) => (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                                  onClick={() => {
                                    setExpediteurId(c.id);
                                    setSelectedExpediteurData(c);
                                    setExpediteurSearch('');
                                    setExpediteurDropdownOpen(false);
                                  }}
                                >
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                    <Icon icon="solar:user-linear" className="size-4" />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium truncate">{c.nom}</p>
                                    {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {canCreateNew && (
                          <div className="border-t pt-1">
                            <button
                              type="button"
                              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-primary hover:bg-primary/10 focus:bg-primary/10 focus:outline-none"
                              onClick={() => openCreateContact(searchTrim)}
                            >
                              <Icon icon="solar:user-plus-linear" className="size-5 shrink-0" />
                              <span>
                                {hasMatches ? 'Créer un autre contact' : `Créer « ${searchTrim} »`}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div>
                <Label>Entité traitante</Label>
                <Select value={entiteTraitanteId ?? ''} onValueChange={(v) => setEntiteTraitanteId(v || null)}>
                  <SelectTrigger className="mt-2 w-full">
                    <SelectValue placeholder="Choisir une entité" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitsFlat.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {'\u00A0'.repeat(u.level * 2)}{u.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Document principal et pièces jointes</Label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  Optionnel. Vous pouvez enregistrer sans fichier. PDF, Word, images : prévisualisation à droite.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt"
                    onChange={handleFileChange}
                    className="max-w-xs"
                  />
                </div>
                {files.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {files.map((fp, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 text-sm border rounded px-2 py-1">
                        <span className="truncate flex-1">{fp.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {i === principalIndex && (
                            <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">Principal</span>
                          )}
                          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeFile(i)}>
                            <Icon icon="solar:trash-bin-trash-linear" className="size-4" />
                          </Button>
                          {files.length > 1 && i !== principalIndex && (
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPrincipalIndex(i)}>
                              Principal
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="pt-2">
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading ? 'Enregistrement...' : 'Enregistrer le courrier'}
                </Button>
              </div>
            </div>
          </CardBox>

          <CardBox className="p-6 flex flex-col min-h-[520px]">
            <h5 className="card-title mb-4 flex items-center gap-2">
              <Icon icon="solar:document-linear" />
              Prévisualisation
            </h5>
            {!principalFile ? (
              <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed bg-muted/30 text-muted-foreground">
                <div className="text-center p-6">
                  <Icon icon="solar:document-add-linear" className="size-16 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">Aucun document</p>
                  <p className="text-xs mt-1">Enregistrement possible sans pièce jointe.</p>
                  <p className="text-xs mt-0.5">Ajoutez un PDF, une image ou un document pour prévisualiser ici.</p>
                </div>
              </div>
            ) : previewPdfUrl ? (
              <div className="flex-1 min-h-0 rounded-lg border overflow-hidden bg-muted/20 flex flex-col">
                <p className="text-xs text-muted-foreground px-2 py-1 border-b bg-muted/30">PDF</p>
                <iframe
                  src={`${previewPdfUrl}#toolbar=1`}
                  title="Prévisualisation PDF"
                  className="flex-1 w-full min-h-[480px] border-0"
                />
              </div>
            ) : previewImageUrl ? (
              <div className="flex-1 min-h-0 rounded-lg border overflow-hidden bg-muted/20 flex flex-col">
                <p className="text-xs text-muted-foreground px-2 py-1 border-b bg-muted/30">Image</p>
                <div className="flex-1 flex items-center justify-center p-4 min-h-[400px]">
                  <img src={previewImageUrl} alt="Prévisualisation" className="max-w-full max-h-[500px] object-contain rounded" />
                </div>
              </div>
            ) : isDocx ? (
              <div className="flex-1 min-h-0 rounded-lg border overflow-hidden bg-muted/20 flex flex-col">
                <p className="text-xs text-muted-foreground px-2 py-1 border-b bg-muted/30">Document Word (.docx)</p>
                <div className="flex-1 overflow-auto p-4 min-h-[400px] bg-background">
                  {docxLoading ? (
                    <div className="flex items-center justify-center h-48 text-muted-foreground">
                      <Icon icon="solar:refresh-linear" className="size-8 animate-spin mr-2" />
                      <span>Chargement de la prévisualisation…</span>
                    </div>
                  ) : docxHtml ? (
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: docxHtml }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Impossible d’afficher la prévisualisation.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center rounded-lg border bg-muted/30 text-muted-foreground">
                <div className="text-center p-6">
                  <Icon icon="solar:document-linear" className="size-14 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium truncate max-w-xs mx-auto">{principalFile.name}</p>
                  {isDocOld ? (
                    <p className="text-xs mt-2">Le format .doc (Word 97-2003) ne peut pas être prévisualisé. Utilisez .docx ou ouvrez le fichier.</p>
                  ) : (
                    <p className="text-xs mt-2">Prévisualisation non disponible pour ce format (Excel, etc.).</p>
                  )}
                  <a
                    href={principalFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary hover:underline"
                  >
                    <Icon icon="solar:download-linear" className="size-4" />
                    Ouvrir le fichier
                  </a>
                </div>
              </div>
            )}
          </CardBox>
        </div>
      </form>

      <Dialog open={contactPopOpen} onOpenChange={setContactPopOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon icon="solar:user-plus-linear" className="size-5" />
              </span>
              Nouveau contact (expéditeur)
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Créez un contact pour l&apos;utiliser comme expéditeur du courrier. Le nom est obligatoire.
            </p>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Nom</Label>
                <Input
                  value={newContact.nom}
                  onChange={(e) => setNewContact((c) => ({ ...c, nom: e.target.value }))}
                  placeholder="Nom du contact"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Type</Label>
                <Select
                  value={newContact.type}
                  onValueChange={(v) => setNewContact((c) => ({ ...c, type: v as ContactType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERSONNE">Personne</SelectItem>
                    <SelectItem value="SOCIETE">Société</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {newContact.type === 'SOCIETE' && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Raison sociale</Label>
                <Input
                  value={newContact.raisonSociale}
                  onChange={(e) => setNewContact((c) => ({ ...c, raisonSociale: e.target.value }))}
                  placeholder="Ex. : SARL Dupont, SA Martin & Cie"
                />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Email</Label>
                <Input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact((c) => ({ ...c, email: e.target.value }))}
                  placeholder="email@exemple.fr"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Téléphone</Label>
                <Input
                  value={newContact.telephone}
                  onChange={(e) => setNewContact((c) => ({ ...c, telephone: e.target.value }))}
                  placeholder="+33 ..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Adresse</Label>
              <Textarea
                value={newContact.adresse}
                onChange={(e) => setNewContact((c) => ({ ...c, adresse: e.target.value }))}
                placeholder="Adresse postale (optionnel)"
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setContactPopOpen(false)} className="gap-2">
              <Icon icon="solar:close-circle-outline" className="size-4" />
              Annuler
            </Button>
            <Button onClick={handleCreateContact} disabled={creatingContact} className="gap-2">
              {creatingContact ? (
                <>
                  <Icon icon="solar:refresh-linear" className="size-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Icon icon="solar:check-circle-outline" className="size-4" />
                  Créer le contact
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
