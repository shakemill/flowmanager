'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Icon } from '@iconify/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Valeurs par défaut si .env non chargées (NEXT_PUBLIC_* sont injectées au build)
const DEFAULT_TIMEOUT = 600;
const DEFAULT_COUNTDOWN = 120;
const THROTTLE_MS = 5000; // Ne réinitialiser le timer qu'au plus toutes les 5 s (évite que mousemove annule tout)

/** Lit une durée en secondes depuis les variables d'environnement (cf. .env NEXT_PUBLIC_INACTIVITY_*). */
function parseEnvSeconds(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const v = (process.env as Record<string, string | undefined>)[key];
  if (v == null || v === '') return fallback;
  const n = parseInt(String(v).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function InactivityCountdown() {
  const { status } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timeoutSecRef = useRef(0);
  const countdownSecRef = useRef(0);
  // Lecture une seule fois au montage (valeurs .env : NEXT_PUBLIC_INACTIVITY_TIMEOUT_SECONDS, NEXT_PUBLIC_INACTIVITY_COUNTDOWN_SECONDS)
  if (timeoutSecRef.current === 0) {
    timeoutSecRef.current = parseEnvSeconds('NEXT_PUBLIC_INACTIVITY_TIMEOUT_SECONDS', DEFAULT_TIMEOUT);
    countdownSecRef.current = parseEnvSeconds('NEXT_PUBLIC_INACTIVITY_COUNTDOWN_SECONDS', DEFAULT_COUNTDOWN);
  }
  const timeoutSec = timeoutSecRef.current;
  const countdownSec = countdownSecRef.current;
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(0);

  const resetIdleTimer = useCallback(() => {
    if (status !== 'authenticated') return;
    if (showModal) return;
    const now = Date.now();
    if (now - lastActivityRef.current < THROTTLE_MS) return;
    lastActivityRef.current = now;
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    idleTimerRef.current = setTimeout(() => {
      setShowModal(true);
      setCountdown(countdownSecRef.current);
    }, timeoutSec * 1000);
  }, [status, timeoutSec, countdownSec, showModal]);

  const handleStayConnected = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setShowModal(false);
    setCountdown(0);
    resetIdleTimer();
  }, [resetIdleTimer]);

  const handleLogout = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setShowModal(false);
    setCountdown(0);
    signOut({ callbackUrl: '/auth/login' });
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    resetIdleTimer();
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetIdleTimer));
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [status, resetIdleTimer]);

  useEffect(() => {
    if (!showModal) return;
    countdownTimerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          signOut({ callbackUrl: '/auth/login' });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [showModal]);

  const m = Math.floor(countdown / 60);
  const s = countdown % 60;
  const countdownLabel = `${m}:${s.toString().padStart(2, '0')}`;

  if (status !== 'authenticated') return null;

  return (
    <Dialog open={showModal} onOpenChange={(open) => !open && handleStayConnected()}>
      <DialogContent className="sm:max-w-md text-center" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <div className="flex flex-col items-center gap-6 pt-2">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
            <Icon icon="solar:clock-circle-linear" className="size-9 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-xl">Inactivité détectée</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground px-2">
            Vous n&apos;avez pas utilisé l&apos;application depuis un moment. Déconnexion automatique dans :
          </p>
          <div className="flex items-center justify-center">
            <span className="font-bold text-4xl tabular-nums text-foreground tracking-tight" aria-live="polite">
              {countdownLabel}
            </span>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0 sm:justify-center mt-4">
          <Button type="button" variant="outline" onClick={handleLogout}>
            Se déconnecter
          </Button>
          <Button type="button" onClick={handleStayConnected}>
            Rester connecté
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
