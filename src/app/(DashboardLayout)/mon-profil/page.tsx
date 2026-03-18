'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import BreadcrumbComp from '@/app/(DashboardLayout)/layout/shared/breadcrumb/BreadcrumbComp';
import CardBox from '@/app/components/shared/CardBox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

const ROLE_LABELS: Record<string, string> = {
  user: 'Utilisateur',
  admin: 'Administrateur',
};

interface MeProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  userOrganisationUnits: {
    id: string;
    niveauAcces: string;
    organisationUnit: { id: string; libelle: string };
  }[];
}

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return '?';
}

const BCrumb = [
  { to: '/', title: 'Accueil' },
  { title: 'Mon profil' },
];

function InfoRow({
  icon,
  label,
  value,
  className,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-3 py-3', className)}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon icon={icon} className="size-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="text-sm font-medium leading-tight">{value}</div>
      </div>
    </div>
  );
}

export default function MonProfilPage() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const name = (session?.user as { name?: string | null })?.name ?? null;
  const email = session?.user?.email ?? null;
  const initials = getInitials(name, email);

  useEffect(() => {
    if (status !== 'authenticated') {
      setLoadingProfile(false);
      return;
    }
    let cancelled = false;
    setLoadingProfile(true);
    setError(null);
    fetch('/api/me')
      .then((res) => {
        if (!res.ok) throw new Error('Impossible de charger le profil');
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data && typeof data === 'object' && 'id' in data && 'email' in data)
          setProfile(data as MeProfile);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? 'Erreur');
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status === 'loading') {
    return (
      <>
        <BreadcrumbComp title="Mon profil" items={BCrumb} />
        <div className="flex min-h-[280px] items-center justify-center rounded-xl border bg-card p-8">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Icon icon="solar:refresh-linear" className="size-10 animate-spin" />
            <p className="text-sm font-medium">Chargement du profil…</p>
          </div>
        </div>
      </>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <>
        <BreadcrumbComp title="Mon profil" items={BCrumb} />
        <Card className="overflow-hidden border-0 shadow-sm">
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-6 bg-muted/30 px-6 py-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Icon icon="solar:user-circle-linear" className="size-12 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Profil non disponible</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Connectez-vous pour consulter et gérer votre profil.
              </p>
            </div>
            <Button asChild>
              <Link href="/auth/login">Se connecter</Link>
            </Button>
          </div>
        </Card>
      </>
    );
  }

  const showProfile = profile && !loadingProfile && !error;

  return (
    <>
      <BreadcrumbComp title="Mon profil" items={BCrumb} />
      <div className="mt-6 sm:mt-8 mx-auto max-w-3xl space-y-6 sm:space-y-8">
        {/* En-tête profil */}
        <Card className="overflow-hidden border-0 shadow-sm">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 py-8 sm:px-8">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
              <Avatar className="h-24 w-24 shrink-0 border-4 border-background shadow-md sm:h-28 sm:w-28">
                <AvatarFallback className="bg-primary/20 text-primary text-2xl font-semibold sm:text-3xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {name ?? 'Sans nom'}
                </h1>
                <p className="mt-1 flex items-center justify-center gap-2 text-muted-foreground sm:justify-start">
                  <Icon icon="solar:letter-linear" className="size-4 shrink-0" />
                  {email ?? '—'}
                </p>
                {showProfile && (
                  <div className="mt-3">
                    <Badge variant="secondary" className="font-normal">
                      {ROLE_LABELS[profile.role] ?? profile.role}
                    </Badge>
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" className="shrink-0" asChild>
                <Link href="/mon-profil/changer-mot-de-passe" className="inline-flex items-center gap-2">
                  <Icon icon="solar:lock-password-linear" className="size-4" />
                  Changer le mot de passe
                </Link>
              </Button>
            </div>
          </div>
        </Card>

        {/* Identité & accès */}
        <div className="grid gap-6 sm:gap-8 sm:grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon icon="solar:user-id-linear" className="size-5 text-primary" />
                Identité
              </CardTitle>
              <CardDescription>Informations de votre compte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-0">
              <InfoRow icon="solar:user-linear" label="Nom" value={name ?? '—'} />
              <Separator />
              <InfoRow
                icon="solar:letter-linear"
                label="Email"
                value={
                  <a
                    href={`mailto:${email ?? ''}`}
                    className="text-primary hover:underline"
                  >
                    {email ?? '—'}
                  </a>
                }
              />
              {loadingProfile && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3 py-3 text-sm text-muted-foreground">
                    <Icon icon="solar:refresh-linear" className="size-4 animate-spin" />
                    Chargement des informations…
                  </div>
                </>
              )}
              {error && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3 py-3 text-sm text-destructive">
                    <Icon icon="solar:danger-circle-linear" className="size-4 shrink-0" />
                    {error}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon icon="solar:buildings-2-linear" className="size-5 text-primary" />
                Services & accès
              </CardTitle>
              <CardDescription>Unités et niveaux d&apos;accès</CardDescription>
            </CardHeader>
            <CardContent>
              {showProfile && profile.userOrganisationUnits.length > 0 ? (
                <ul className="space-y-3">
                  {profile.userOrganisationUnits.map((uou) => (
                    <li
                      key={uou.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5"
                    >
                      <Icon icon="solar:buildings-2-linear" className="size-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{uou.organisationUnit.libelle}</span>
                      <Badge
                        className={cn(
                          'text-xs shrink-0',
                          NIVEAU_BADGE[uou.niveauAcces] ?? 'bg-muted'
                        )}
                      >
                        {NIVEAUX.find((n) => n.value === uou.niveauAcces)?.label ?? uou.niveauAcces}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {loadingProfile ? 'Chargement…' : 'Aucun service ou unité assigné.'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Compte & dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon icon="solar:calendar-linear" className="size-5 text-primary" />
              Compte
            </CardTitle>
            <CardDescription>Dates de création et mise à jour</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon icon="solar:calendar-add-linear" className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Compte créé le
                  </p>
                  <p className="text-sm font-medium">
                    {showProfile && profile.createdAt
                      ? format(new Date(profile.createdAt), "d MMMM yyyy", { locale: fr })
                      : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon icon="solar:calendar-mark-linear" className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Dernière mise à jour
                  </p>
                  <p className="text-sm font-medium">
                    {showProfile && profile.updatedAt
                      ? format(new Date(profile.updatedAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
