'use client';

import * as React from 'react';
import { Icon } from '@iconify/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export type ConfirmDialogVariant = 'success' | 'danger' | 'warning' | 'info';

const variantConfig: Record<
  ConfirmDialogVariant,
  { icon: string; iconClass: string; actionVariant?: 'default' | 'destructive' }
> = {
  success: {
    icon: 'solar:check-circle-bold',
    iconClass: 'text-success',
    actionVariant: 'default',
  },
  danger: {
    icon: 'solar:danger-circle-bold',
    iconClass: 'text-destructive',
    actionVariant: 'destructive',
  },
  warning: {
    icon: 'solar:warning-circle-bold',
    iconClass: 'text-warning',
    actionVariant: 'default',
  },
  info: {
    icon: 'solar:info-circle-bold',
    iconClass: 'text-info',
    actionVariant: 'default',
  },
};

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  variant?: ConfirmDialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  variant = 'info',
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const [isLoading, setLoading] = React.useState(false);
  const busy = loading || isLoading;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', config.iconClass)}>
              <Icon icon={config.icon} className="size-6" />
            </span>
            <div className="space-y-1.5">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription>{message}</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={busy}
            className={config.actionVariant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
          >
            {busy ? 'Chargement...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
