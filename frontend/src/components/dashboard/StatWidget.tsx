import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LucideIcon } from 'lucide-react';
import { Box, Flex, Text, Skeleton, Icon as ChakraIcon } from '@chakra-ui/react';

interface StatWidgetProps {
    label: string;
    value: string | number | null | undefined;
    icon?: LucideIcon;
    unit?: string;
    isLoading?: boolean;
    isClickable?: boolean;
    linkTo?: string;
    linkState?: any;
}

const StatWidget: React.FC<StatWidgetProps> = ({
    label, value, icon: IconComponent, unit, isLoading = false, isClickable = false, linkTo, linkState,
}) => {
    const navigate = useNavigate();

    const handleClick = () => {
        if (isClickable && linkTo) {
            navigate(linkTo, { state: linkState });
        }
    };

    return (
        <Box
            bg="white"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="16px"
            p={{ base: '16px', md: '20px' }}
            cursor={isClickable ? 'pointer' : 'default'}
            onClick={isClickable ? handleClick : undefined}
            transition="all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
            _hover={isClickable ? {
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
                transform: 'translateY(-2px)',
                borderColor: 'gray.300',
            } : undefined}
            position="relative"
            overflow="hidden"
        >
            <Flex justify="space-between" align="flex-start">
                <Box flex="1">
                    <Flex align="center" gap="10px" mb="12px">
                        {IconComponent && (
                            <Flex
                                w="36px" h="36px"
                                borderRadius="10px"
                                bg="brand.50"
                                align="center"
                                justify="center"
                                flexShrink={0}
                            >
                                <IconComponent size={18} color="#0D9488" />
                            </Flex>
                        )}
                        <Text
                            fontSize="0.8125rem"
                            fontWeight="600"
                            color="gray.500"
                            letterSpacing="0.01em"
                            lineHeight="1.2"
                        >
                            {label}
                        </Text>
                    </Flex>
                    {isLoading ? (
                        <Skeleton height="32px" width="80px" borderRadius="8px" />
                    ) : (
                        <Flex align="baseline" gap="4px">
                            <Text
                                fontSize={{ base: '1.75rem', md: '2rem' }}
                                fontWeight="700"
                                color="gray.900"
                                lineHeight="1"
                                letterSpacing="-0.025em"
                            >
                                {value !== null && value !== undefined ? value : '—'}
                            </Text>
                            {unit && value !== null && value !== undefined && (
                                <Text fontSize="0.875rem" fontWeight="500" color="gray.400" ml="2px">
                                    {unit}
                                </Text>
                            )}
                        </Flex>
                    )}
                </Box>
                {isClickable && !isLoading && (
                    <Flex
                        align="center"
                        justify="center"
                        w="28px" h="28px"
                        borderRadius="8px"
                        bg="gray.50"
                        mt="2px"
                        opacity={0}
                        transition="opacity 0.2s ease"
                        sx={{ '.stat-widget-box:hover &': { opacity: 1 } }}
                        className="arrow-icon"
                    >
                        <ArrowRight size={14} color="#9CA3AF" />
                    </Flex>
                )}
            </Flex>
        </Box>
    );
};

export default StatWidget;
