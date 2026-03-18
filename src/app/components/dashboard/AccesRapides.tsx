'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import CardBox from '@/app/components/shared/CardBox';

const LINKS = [
  { href: '/courrier/enregistrement', label: 'Enregistrer un courrier', icon: 'solar:add-circle-linear' },
  { href: '/courrier', label: 'Liste du courrier', icon: 'solar:inbox-linear' },
  { href: '/courrier/mes-banettes', label: 'Mes banettes', icon: 'solar:inbox-linear' },
  { href: '/mon-profil', label: 'Mon profil', icon: 'solar:user-circle-linear' },
];

export default function AccesRapides() {
  return (
    <CardBox className="p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="shrink-0">
          <h5 className="card-title flex items-center gap-2">
            <Icon icon="solar:link-circle-linear" className="size-5 text-primary" />
            Accès rapides
          </h5>
          <p className="text-xs text-muted-foreground mt-1">Actions fréquentes</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {LINKS.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-2 rounded-lg border bg-muted/20 px-4 py-2.5 transition-colors hover:bg-muted/40 hover:border-primary/30 shrink-0"
            >
              <Icon icon={icon} className="size-5 text-primary shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </CardBox>
  );
}
