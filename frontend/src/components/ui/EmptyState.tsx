// src/components/ui/EmptyState.tsx
// Rich empty state with decorative double-ring icon and optional CTA
import React from 'react';
import { VStack, Flex, Heading, Text, Box, Button, BoxProps, Icon } from '@chakra-ui/react';
import { LucideIcon, Inbox, Plus } from 'lucide-react';

interface EmptyStateProps extends BoxProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  colorScheme?: string;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  colorScheme = 'teal',
  compact = false,
  ...boxProps
}) => {
  const IconComp = icon;
  return (
    <VStack
      spacing={compact ? 2 : 4}
      py={compact ? 10 : 16}
      px={6}
      textAlign="center"
      {...boxProps}
    >
      {/* Decorative double-ring icon */}
      <Flex
        align="center"
        justify="center"
        w={compact ? '56px' : '72px'}
        h={compact ? '56px' : '72px'}
        borderRadius="full"
        bg={`${colorScheme}.50`}
        mb={compact ? 1 : 2}
      >
        <Flex
          align="center"
          justify="center"
          w={compact ? '40px' : '48px'}
          h={compact ? '40px' : '48px'}
          borderRadius="full"
          bg={`${colorScheme}.100`}
        >
          <Icon
            as={IconComp}
            boxSize={compact ? '18px' : '22px'}
            color={`${colorScheme}.500`}
            strokeWidth={1.5}
          />
        </Flex>
      </Flex>

      <Heading
        as="h3"
        fontSize={compact ? 'md' : 'lg'}
        fontWeight="600"
        color="gray.800"
        letterSpacing="-0.01em"
      >
        {title}
      </Heading>
      {description && (
        <Text
          fontSize="sm"
          color="gray.500"
          maxW="360px"
          lineHeight="1.6"
        >
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          colorScheme={colorScheme}
          size="sm"
          mt={2}
          leftIcon={<Icon as={Plus} boxSize="4" />}
          onClick={onAction}
          borderRadius="lg"
          fontWeight="500"
          px={4}
        >
          {actionLabel}
        </Button>
      )}
    </VStack>
  );
};
