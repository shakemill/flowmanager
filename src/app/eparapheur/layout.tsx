'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function canAccessEparapheur(session: { user?: { role?: string; roles?: string[] } } | null): boolean {
  if (!session?.user) return false;
  const role = session.user.role;
  const roles = session.user.roles ?? [];
  return role === 'admin' || roles.includes('eparapheur');
}

export default function EparapheurLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.replace('/auth/login?callbackUrl=/eparapheur');
      return;
    }
    if (!canAccessEparapheur(session)) {
      router.replace('/auth/login?callbackUrl=/eparapheur');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }
  if (!canAccessEparapheur(session)) {
    return null;
  }

  return <div className="min-h-screen bg-background">{children}</div>;
}
