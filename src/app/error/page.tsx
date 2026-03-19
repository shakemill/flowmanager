'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Page de secours si une redirection pointe encore vers /error.
 * Redirige vers la page de login (avec le paramètre error conservé).
 */
export default function ErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    const callbackUrl = searchParams.get('callbackUrl') ?? '/';
    const params = new URLSearchParams();
    if (error) params.set('error', error);
    if (callbackUrl && callbackUrl !== '/') params.set('callbackUrl', callbackUrl);
    const qs = params.toString();
    router.replace(`/auth/login${qs ? `?${qs}` : ''}`);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      Redirection vers la page de connexion...
    </div>
  );
}
