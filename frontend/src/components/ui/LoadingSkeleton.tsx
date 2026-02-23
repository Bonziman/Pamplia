// src/components/ui/LoadingSkeleton.tsx
// Content-shaped skeleton loaders for perceived performance
import React from 'react';
import {
  Skeleton,
  SkeletonText,
  SkeletonCircle,
  VStack,
  HStack,
  Box,
  SimpleGrid,
  BoxProps,
  Flex,
} from '@chakra-ui/react';

// Full-page loading spinner (now a content skeleton instead of spinner)
export const PageLoader: React.FC<BoxProps> = (props) => (
  <Box minH="400px" {...props}>
    <VStack spacing={6} align="stretch">
      {/* Header skeleton */}
      <Flex justify="space-between" align="center">
        <Skeleton h="28px" w="200px" borderRadius="md" />
        <Skeleton h="36px" w="140px" borderRadius="lg" />
      </Flex>
      {/* Stats skeleton */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={5}>
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </SimpleGrid>
      {/* Table skeleton */}
      <TableSkeleton rows={5} columns={5} />
    </VStack>
  </Box>
);

// Stat card skeleton — matches DataCard design
export const StatCardSkeleton: React.FC = () => (
  <Box
    bg="white"
    borderRadius="xl"
    border="1px solid"
    borderColor="gray.200"
    p={5}
  >
    <Flex justify="space-between" align="flex-start" mb={3}>
      <Skeleton h="14px" w="90px" borderRadius="md" />
      <Skeleton h="38px" w="38px" borderRadius="lg" />
    </Flex>
    <Skeleton h="32px" w="80px" mb={2} borderRadius="md" />
    <Skeleton h="18px" w="120px" borderRadius="md" />
  </Box>
);

// Stat grid skeleton
export const StatsGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <SimpleGrid columns={{ base: 1, sm: 2, lg: count }} gap={5}>
    {Array.from({ length: count }).map((_, i) => (
      <StatCardSkeleton key={i} />
    ))}
  </SimpleGrid>
);

// Table skeleton — mimics real table rows
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 5,
}) => (
  <Box
    bg="white"
    borderRadius="xl"
    border="1px solid"
    borderColor="gray.200"
    overflow="hidden"
  >
    {/* Header */}
    <HStack spacing={4} px={5} py={3.5} bg="gray.50" borderBottom="1px solid" borderColor="gray.200">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} h="10px" flex={1} borderRadius="md" />
      ))}
    </HStack>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <HStack
        key={rowIdx}
        spacing={4}
        px={5}
        py={4}
        borderBottom="1px solid"
        borderColor={rowIdx === rows - 1 ? 'transparent' : 'gray.100'}
      >
        {rowIdx % 3 === 0 && <SkeletonCircle size="32px" flexShrink={0} />}
        {Array.from({ length: rowIdx % 3 === 0 ? columns - 1 : columns }).map((_, colIdx) => (
          <Skeleton
            key={colIdx}
            h="14px"
            flex={1}
            borderRadius="md"
            w={colIdx === 0 ? '120px' : undefined}
          />
        ))}
      </HStack>
    ))}
  </Box>
);

// Profile skeleton
export const ProfileSkeleton: React.FC = () => (
  <VStack spacing={4} align="center" py={8}>
    <SkeletonCircle size="80px" />
    <Skeleton h="20px" w="160px" borderRadius="md" />
    <Skeleton h="14px" w="200px" borderRadius="md" />
    <HStack spacing={3} mt={2}>
      <Skeleton h="32px" w="80px" borderRadius="lg" />
      <Skeleton h="32px" w="80px" borderRadius="lg" />
    </HStack>
  </VStack>
);

// Card skeleton
export const CardSkeleton: React.FC = () => (
  <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" p={5}>
    <HStack spacing={3} mb={4}>
      <SkeletonCircle size="40px" />
      <VStack align="start" spacing={1} flex={1}>
        <Skeleton h="14px" w="120px" borderRadius="md" />
        <Skeleton h="12px" w="180px" borderRadius="md" />
      </VStack>
    </HStack>
    <SkeletonText noOfLines={3} spacing="3" />
  </Box>
);

// Chart skeleton — shows a chart-like placeholder
export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = '220px' }) => (
  <Box
    bg="white"
    borderRadius="xl"
    border="1px solid"
    borderColor="gray.200"
    p={5}
    h={height}
  >
    <Flex justify="space-between" align="center" mb={4}>
      <Skeleton h="16px" w="120px" borderRadius="md" />
      <Skeleton h="14px" w="80px" borderRadius="md" />
    </Flex>
    <Flex align="flex-end" h="calc(100% - 50px)" gap="3" px={2}>
      {[40, 65, 50, 80, 45, 70, 55].map((h, i) => (
        <Skeleton
          key={i}
          flex={1}
          h={`${h}%`}
          borderRadius="md"
          opacity={0.6 + i * 0.05}
        />
      ))}
    </Flex>
  </Box>
);
