'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import BreadcrumbComp from '@/app/(DashboardLayout)/layout/shared/breadcrumb/BreadcrumbComp';
import CardBox from '@/app/components/shared/CardBox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';

const BCrumb = [
  { to: '/', title: 'Accueil' },
  { to: '/mon-profil', title: 'Mon profil' },
  { title: 'Changer le mot de passe' },
];

const MIN_PASSWORD_LENGTH = 8;

export default function ChangerMotDePassePage() {
  const { status } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim()) {
      toast.warning('Saisissez votre mot de passe actuel');
      return;
    }
    if (!newPassword) {
      toast.warning('Saisissez le nouveau mot de passe');
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toast.warning(`Le nouveau mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.warning('Les deux mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/me/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? 'Erreur lors du changement de mot de passe');
        return;
      }
      toast.success(
        'Mot de passe modifié avec succès',
        data?.emailSent ? 'Un email de confirmation vous a été envoyé.' : undefined
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <>
        <BreadcrumbComp title="Changer le mot de passe" items={BCrumb} />
        <CardBox className="p-8 text-center text-muted-foreground">
          <Icon icon="solar:refresh-linear" className="size-8 animate-spin mx-auto mb-2" />
          Chargement…
        </CardBox>
      </>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <>
        <BreadcrumbComp title="Changer le mot de passe" items={BCrumb} />
        <CardBox className="p-8 text-center text-muted-foreground">
          <Icon icon="solar:lock-linear" className="size-12 mx-auto mb-2 opacity-50" />
          <p>Connectez-vous pour modifier votre mot de passe.</p>
          <Button asChild variant="link" className="mt-4">
            <Link href="/auth/login">Se connecter</Link>
          </Button>
        </CardBox>
      </>
    );
  }

  return (
    <>
      <BreadcrumbComp title="Changer le mot de passe" items={BCrumb} />
      <div className="max-w-md">
        <CardBox className="p-6 border rounded-xl shadow-sm bg-card">
          <div className="flex items-center gap-2 mb-6">
            <Icon icon="solar:lock-password-linear" className="size-6 text-primary" />
            <h2 className="text-lg font-semibold">Modifier votre mot de passe</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Après modification, un email de confirmation vous sera envoyé à l&apos;adresse de votre compte.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <div className="relative mt-1.5">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showCurrentPassword ? 'Masquer le mot de passe actuel' : 'Afficher le mot de passe actuel'}
                >
                  <Icon icon={showCurrentPassword ? 'solar:eye-closed-linear' : 'solar:eye-linear'} className="size-5" />
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <div className="relative mt-1.5">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={`Au moins ${MIN_PASSWORD_LENGTH} caractères`}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showNewPassword ? 'Masquer le nouveau mot de passe' : 'Afficher le nouveau mot de passe'}
                >
                  <Icon icon={showNewPassword ? 'solar:eye-closed-linear' : 'solar:eye-linear'} className="size-5" />
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
              <div className="relative mt-1.5">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirmPassword ? 'Masquer la confirmation du mot de passe' : 'Afficher la confirmation du mot de passe'}
                >
                  <Icon icon={showConfirmPassword ? 'solar:eye-closed-linear' : 'solar:eye-linear'} className="size-5" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Icon icon="solar:refresh-linear" className="size-4 animate-spin mr-2" />
                    Modification…
                  </>
                ) : (
                  'Changer le mot de passe'
                )}
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link href="/mon-profil">Retour au profil</Link>
              </Button>
            </div>
          </form>
        </CardBox>
      </div>
    </>
  );
}
