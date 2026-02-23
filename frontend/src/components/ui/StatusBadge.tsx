// src/components/ui/StatusBadge.tsx
import React from 'react';
import { Badge, BadgeProps } from '@chakra-ui/react';

type StatusType =
  | 'confirmed' | 'active'
  | 'pending'
  | 'cancelled' | 'canceled'
  | 'completed'
  | 'no_show' | 'no-show'
  | 'rescheduled'
  | 'deleted'
  | 'invited'
  | 'expired';

const statusConfig: Record<string, { colorScheme: string; label?: string }> = {
  confirmed:   { colorScheme: 'green' },
  active:      { colorScheme: 'green' },
  pending:     { colorScheme: 'yellow' },
  cancelled:   { colorScheme: 'red' },
  canceled:    { colorScheme: 'red', label: 'Cancelled' },
  completed:   { colorScheme: 'blue' },
  no_show:     { colorScheme: 'red', label: 'No Show' },
  'no-show':   { colorScheme: 'red', label: 'No Show' },
  rescheduled: { colorScheme: 'orange' },
  deleted:     { colorScheme: 'red' },
  invited:     { colorScheme: 'blue' },
  expired:     { colorScheme: 'gray' },
};

interface StatusBadgeProps extends Omit<BadgeProps, 'colorScheme'> {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, ...badgeProps }) => {
  const key = status?.toLowerCase().replace(/\s+/g, '_') || 'unknown';
  const config = statusConfig[key] || { colorScheme: 'gray' };
  const label = config.label || status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';

  return (
    <Badge
      variant="subtle"
      colorScheme={config.colorScheme}
      borderRadius="full"
      px={2.5}
      py={0.5}
      fontSize="xs"
      fontWeight="medium"
      {...badgeProps}
    >
      {label}
    </Badge>
  );
};
