// src/hooks/useBrandedToast.ts
import { useToast, UseToastOptions } from '@chakra-ui/react';
import { getErrorMessage } from '../utils/errorUtils';

export const useBrandedToast = () => {
  const chakraToast = useToast();

  const defaults: Partial<UseToastOptions> = {
    position: 'top-right',
    duration: 4000,
    isClosable: true,
    variant: 'subtle',
  };

  const toast = (options: UseToastOptions) => {
    let colorScheme = options.colorScheme;
    if (!colorScheme) {
      switch (options.status) {
        case 'success': colorScheme = 'brand'; break;
        case 'error':   colorScheme = 'red'; break;
        case 'warning': colorScheme = 'yellow'; break;
        case 'info':    colorScheme = 'blue'; break;
        default:        colorScheme = 'gray';
      }
    }
    chakraToast({ ...defaults, ...options, colorScheme });
  };

  /** Show a success toast */
  toast.success = (title: string, description?: string) => {
    toast({ status: 'success', title, description });
  };

  /** Show an error toast. Accepts an Error, Axios error, string, or unknown. */
  toast.error = (error: unknown, fallback?: string) => {
    const message = typeof error === 'string' ? error : getErrorMessage(error, fallback);
    toast({ status: 'error', title: 'Error', description: message });
  };

  /** Show a warning toast */
  toast.warning = (title: string, description?: string) => {
    toast({ status: 'warning', title, description });
  };

  /** Show an info toast */
  toast.info = (title: string, description?: string) => {
    toast({ status: 'info', title, description });
  };

  return toast;
};
