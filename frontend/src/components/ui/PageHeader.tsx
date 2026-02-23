// src/components/ui/PageHeader.tsx
import React from 'react';
import { Flex, Heading, Text, Box, BoxProps } from '@chakra-ui/react';

interface PageHeaderProps extends BoxProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  ...boxProps
}) => {
  return (
    <Flex
      align={{ base: 'flex-start', sm: 'center' }}
      justify="space-between"
      direction={{ base: 'column', sm: 'row' }}
      gap={3}
      mb={6}
      {...boxProps}
    >
      <Box>
        <Heading as="h1" size="lg" color="gray.900">
          {title}
        </Heading>
        {description && (
          <Text variant="secondary" mt={1}>
            {description}
          </Text>
        )}
      </Box>
      {actions && (
        <Flex gap={2} flexShrink={0}>
          {actions}
        </Flex>
      )}
    </Flex>
  );
};
