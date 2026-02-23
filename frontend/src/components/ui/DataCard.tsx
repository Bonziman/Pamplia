// src/components/ui/DataCard.tsx
// Enhanced stat card inspired by OripioFin / HriseLink reference dashboards
import React from 'react';
import {
  Box,
  Flex,
  Text,
  Heading,
  BoxProps,
  Skeleton,
  SkeletonCircle,
} from '@chakra-ui/react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AppIcon } from './Icon';

type CardVariant = 'default' | 'primary' | 'outlined';

interface DataCardProps extends BoxProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  change?: number | null;
  changeLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  isLoading?: boolean;
  onClick?: () => void;
  variant?: CardVariant;
  subtitle?: string;
}

export const DataCard: React.FC<DataCardProps> = ({
  label,
  value,
  unit,
  change,
  changeLabel = 'vs yesterday',
  icon,
  iconColor = 'brand.500',
  iconBg = 'brand.50',
  isLoading = false,
  onClick,
  variant = 'default',
  subtitle,
  ...boxProps
}) => {
  const isPositive = change !== null && change !== undefined && change >= 0;
  const isNeutral = change !== null && change !== undefined && change === 0;
  const hasChange = change !== null && change !== undefined;

  const isPrimary = variant === 'primary';

  return (
    <Box
      bg={isPrimary ? 'brand.500' : 'white'}
      borderRadius="xl"
      border="1px solid"
      borderColor={isPrimary ? 'brand.600' : 'gray.200'}
      p={{ base: 4, md: 5 }}
      transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
      cursor={onClick ? 'pointer' : 'default'}
      _hover={onClick ? {
        shadow: 'lg',
        transform: 'translateY(-2px)',
        borderColor: isPrimary ? 'brand.700' : 'gray.300',
      } : {
        shadow: 'md',
        borderColor: isPrimary ? 'brand.700' : 'gray.300',
      }}
      position="relative"
      overflow="hidden"
      onClick={onClick}
      {...boxProps}
    >
      {isLoading ? (
        <Flex direction="column" gap={3}>
          <Flex justify="space-between" align="center">
            <Skeleton h="14px" w="100px" borderRadius="md" />
            <SkeletonCircle size="36px" />
          </Flex>
          <Skeleton h="32px" w="80px" borderRadius="md" />
          <Skeleton h="12px" w="130px" borderRadius="md" />
        </Flex>
      ) : (
        <>
          <Flex align="flex-start" justify="space-between" mb={3}>
            <Text
              color={isPrimary ? 'whiteAlpha.800' : 'gray.500'}
              fontSize="sm"
              fontWeight="medium"
              letterSpacing="-0.01em"
              lineHeight="1.3"
              mb="0"
            >
              {label}
            </Text>
            {icon && (
              <Flex
                align="center"
                justify="center"
                w="38px"
                h="38px"
                borderRadius="lg"
                bg={isPrimary ? 'whiteAlpha.200' : iconBg}
                flexShrink={0}
              >
                <AppIcon
                  icon={icon}
                  size="sm"
                  color={isPrimary ? 'white' : iconColor}
                />
              </Flex>
            )}
          </Flex>

          <Heading
            as="div"
            fontSize={{ base: '2xl', md: '3xl' }}
            fontWeight="700"
            color={isPrimary ? 'white' : 'gray.900'}
            letterSpacing="-0.02em"
            lineHeight="1.1"
            mb={hasChange || subtitle ? 2 : 0}
          >
            {value !== null && value !== undefined ? value : '—'}
            {unit && (
              <Text
                as="span"
                fontSize="sm"
                color={isPrimary ? 'whiteAlpha.700' : 'gray.400'}
                fontWeight="medium"
                ml={1.5}
              >
                {unit}
              </Text>
            )}
          </Heading>

          {hasChange && (
            <Flex align="center" gap={1.5} mt={1}>
              <Flex
                align="center"
                gap="1"
                px={1.5}
                py={0.5}
                borderRadius="md"
                bg={isPrimary
                  ? 'whiteAlpha.200'
                  : isNeutral
                    ? 'gray.100'
                    : isPositive ? 'green.50' : 'red.50'
                }
              >
                <AppIcon
                  icon={isNeutral ? Minus : (isPositive ? TrendingUp : TrendingDown)}
                  size="xs"
                  color={isPrimary
                    ? 'white'
                    : isNeutral
                      ? 'gray.500'
                      : isPositive ? 'green.600' : 'red.600'
                  }
                />
                <Text
                  fontSize="xs"
                  fontWeight="600"
                  color={isPrimary
                    ? 'white'
                    : isNeutral
                      ? 'gray.600'
                      : isPositive ? 'green.600' : 'red.600'
                  }
                  mb="0"
                >
                  {isPositive && !isNeutral ? '+' : ''}{change.toFixed(1)}%
                </Text>
              </Flex>
              {changeLabel && (
                <Text
                  fontSize="xs"
                  color={isPrimary ? 'whiteAlpha.600' : 'gray.400'}
                  mb="0"
                >
                  {changeLabel}
                </Text>
              )}
            </Flex>
          )}

          {subtitle && !hasChange && (
            <Text
              fontSize="xs"
              color={isPrimary ? 'whiteAlpha.700' : 'gray.400'}
              mb="0"
            >
              {subtitle}
            </Text>
          )}
        </>
      )}
    </Box>
  );
};
