// src/hooks/useBrandedToast.ts
import { useToast, UseToastOptions } from '@chakra-ui/react';

export const useBrandedToast = () => {
    const chakraToast = useToast();

    const toast = (options: UseToastOptions) => {
        // Apply default branding options here
        // Your theme has brand.500 as a teal color.
        // Success = brand, Error = red, Warning = yellow, Info = blue (from your theme)
        let colorScheme = options.colorScheme;
        if (!colorScheme) {
            switch (options.status) {
                case 'success':
                    colorScheme = 'brand'; // Your primary brand color for success
                    break;
                case 'error':
                    colorScheme = 'red';
                    break;
                case 'warning':
                    colorScheme = 'yellow';
                    break;
                case 'info':
                    colorScheme = 'blue';
                    break;
                default:
                    colorScheme = 'gray'; // Default if no status
            }
        }

        chakraToast({
            position: 'top-right',
            duration: 5000,
            isClosable: true,
            variant: 'subtle', // Or 'solid', 'left-accent', 'top-accent'
            ...options, // Allow overriding defaults
            colorScheme: colorScheme, // Apply determined color scheme
        });
    };

    return toast;
};
