// src/components/ui/Icon.tsx
import React from 'react';
import { Box, BoxProps } from '@chakra-ui/react';
import { LucideIcon } from 'lucide-react';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<IconSize, number> = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
};

interface AppIconProps extends Omit<BoxProps, 'as'> {
  icon: LucideIcon;
  size?: IconSize;
  strokeWidth?: number;
}

export const AppIcon: React.FC<AppIconProps> = ({
  icon: LucideIconComp,
  size = 'md',
  strokeWidth = 1.75,
  color,
  ...boxProps
}) => {
  const pixelSize = sizeMap[size];

  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
      color={color}
      {...boxProps}
    >
      <LucideIconComp size={pixelSize} strokeWidth={strokeWidth} />
    </Box>
  );
};
