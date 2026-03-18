'use client';

import { toast as sonnerToast } from 'sonner';
import { Icon } from '@iconify/react';

export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      icon: <Icon icon="solar:check-circle-bold" className="size-5" />,
    });
  },
  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      icon: <Icon icon="solar:danger-circle-bold" className="size-5" />,
    });
  },
  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      icon: <Icon icon="solar:info-circle-bold" className="size-5" />,
    });
  },
  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
      icon: <Icon icon="solar:warning-circle-bold" className="size-5" />,
    });
  },
  promise: <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
      icon: <Icon icon="solar:clock-circle-bold" className="size-5" />,
    });
  },
};
