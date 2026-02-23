// src/pages/DashboardOverviewPage.tsx

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardStats, useRevenueChart, queryKeys } from '../hooks/useQueryHooks';
import { StatsPeriod, STATS_PERIOD_LABELS, DailyRevenueData } from '../types/Dashboard';
import { FetchedAppointment } from '../api/appointmentApi';
import {
  Plus, DollarSign, CalendarCheck, Clock, Users, Building2, Briefcase, TrendingUp,
    CalendarDays, ArrowRight, Sparkles, AlertTriangle,
} from 'lucide-react';

import {
  Button as ChakraButton, Heading, Flex, Box, Select, Text, Center,
  SimpleGrid, Icon, VStack, HStack, Badge, Divider, Skeleton,
  useTheme,
} from '@chakra-ui/react';
import { XAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { DataCard, StatsGridSkeleton, ChartSkeleton } from '../components/ui';

type DashboardOverviewPageProps = {
    userName?: string;
    onOpenCreateAppointmentModal: (onCreated?: () => void) => void;
    userRole?: string;
    appointments?: FetchedAppointment[];
    loadingAppointments?: boolean;
    onAppointmentClick?: (appointment: FetchedAppointment) => void;
};

const DashboardOverviewPage: React.FC<DashboardOverviewPageProps> = ({
    userName, onOpenCreateAppointmentModal, userRole,
    appointments = [], loadingAppointments = false, onAppointmentClick,
}) => {
    const UI_LOCALE = 'fr-MA';
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedPeriod, setSelectedPeriod] = useState<StatsPeriod>('last_7_days');
    const theme = useTheme();

    // React Query hooks
    const { data: stats, isLoading: isLoadingStats, error: statsError } = useDashboardStats(selectedPeriod);
    const { data: chartDataResponse, isLoading: isLoadingChart, error: chartQueryError } = useRevenueChart();

    const error = statsError ? (statsError as any)?.response?.data?.detail || 'Failed to load dashboard data.' : null;
    const chartError = chartQueryError ? 'Chart data is unavailable.' : null;

    // Transform chart data
    const revenueChartData = chartDataResponse?.trend
      ? chartDataResponse.trend.map((item: DailyRevenueData) => ({
                    name: new Date(item.date).toLocaleDateString(UI_LOCALE, { month: 'short', day: 'numeric' }),
          revenue: item.revenue,
        }))
      : [];

    const handlePeriodChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedPeriod(event.target.value as StatsPeriod);
    };

    const handleAppointmentCreated = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats(selectedPeriod) });
        queryClient.invalidateQueries({ queryKey: queryKeys.revenueChart });
    }, [queryClient, selectedPeriod]);

    const handleRetry = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats(selectedPeriod) });
        queryClient.invalidateQueries({ queryKey: queryKeys.revenueChart });
    }, [queryClient, selectedPeriod]);

    const formatCurrency = (value: number | null | undefined) => {
        if (value === null || value === undefined) return '—';
        return value.toFixed(2);
    };

    const formatCurrencyForChartTooltip = (value: number) => `${value.toFixed(2)} DH`;

    // --- TODAY'S AGENDA ---
    const todaysAppointments = useMemo(() => {
        const today = new Date();
        const todayStr = today.toDateString();
        return appointments
            .filter(appt => {
                try {
                    return new Date(appt.appointment_time).toDateString() === todayStr;
                } catch { return false; }
            })
            .sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime());
    }, [appointments]);

    const nextUpcomingAppointment = useMemo(() => {
        const now = new Date();
        return todaysAppointments.find(appt => new Date(appt.appointment_time) >= now) || null;
    }, [todaysAppointments]);

    const normalizeStatus = (status: string | undefined | null) => {
        const statusValue = (status || '').toLowerCase();
        if (statusValue === 'completed') return 'done';
        if (statusValue === 'canceled') return 'cancelled';
        return statusValue;
    };

    const getStatusLabel = (status: string | undefined | null) => {
        const normalized = normalizeStatus(status);
        if (normalized === 'done') return 'Completed';
        if (normalized === 'pending') return 'Pending';
        if (normalized === 'confirmed') return 'Confirmed';
        if (normalized === 'cancelled') return 'Cancelled';
        return 'Unknown';
    };

    const formatTime = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleTimeString(UI_LOCALE, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            });
        } catch { return '--:--'; }
    };

    const getStatusColor = (status: string) => {
        switch (normalizeStatus(status)) {
            case 'confirmed': return 'green';
            case 'pending': return 'yellow';
            case 'cancelled': return 'red';
            case 'done': return 'gray';
            default: return 'gray';
        }
    };

    const needsAttentionItems = [
        {
            label: 'Pending Appointments',
            value: stats?.pending_appointments_total ?? 0,
            actionLabel: 'Review',
            onClick: () => navigate('/dashboard/calendar'),
        },
        {
            label: 'Unconfirmed Clients',
            value: stats?.unconfirmed_clients_total ?? 0,
            actionLabel: 'View',
            onClick: () => navigate('/dashboard/clients'),
        },
    ];

    return (
        <Box px={{ base: 0, md: 0 }} py={0}>
            {/* Page Header */}
            <Flex
                align={{ base: 'flex-start', md: 'center' }}
                justify="space-between"
                direction={{ base: 'column', md: 'row' }}
                gap={3}
                mb={6}
            >
                <Box>
                    <Heading as="h1" size="xl" color="gray.900" fontWeight="700" letterSpacing="-0.02em">
                        Hello, {userName ? userName.split(' ')[0] : 'there'} 👋
                    </Heading>
                    <Text color="gray.500" fontSize="sm" mt={1} mb={0}>
                        Here's what's happening with your business today
                    </Text>
                </Box>
                {userRole === 'super_admin' ? (
                    <Flex gap="3" flexWrap="wrap">
                        <ChakraButton
                            colorScheme="brand"
                            onClick={() => navigate('/dashboard/tenants')}
                            size="md"
                        >
                            Manage Tenants
                        </ChakraButton>
                        <ChakraButton
                            variant="outline"
                            colorScheme="brand"
                            onClick={() => navigate('/dashboard/users')}
                            size="md"
                        >
                            Manage Users
                        </ChakraButton>
                    </Flex>
                ) : (
                    <ChakraButton
                        colorScheme="brand"
                        onClick={() => onOpenCreateAppointmentModal(handleAppointmentCreated)}
                        leftIcon={<Plus size={16} />}
                        size="md"
                    >
                        New Appointment
                    </ChakraButton>
                )}
            </Flex>

            {/* Error state */}
            {error && !isLoadingStats && (
                <Box
                    p={5}
                    bg="red.50"
                    color="red.700"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="red.200"
                    mb={6}
                >
                    <Text fontWeight="600" mb={1}>Failed to load dashboard data</Text>
                    <Text fontSize="sm" color="red.600">{error}</Text>
                    <ChakraButton colorScheme="red" variant="link" size="sm" mt={2} onClick={handleRetry}>
                        Try Again
                    </ChakraButton>
                </Box>
            )}

            {/* Super Admin Platform Overview */}
            {userRole === 'super_admin' && (
                <Box mb={8}>
                    <Flex align="center" gap={2} mb={4}>
                        <Icon as={Building2} boxSize="5" color="gray.500" strokeWidth={1.5} />
                        <Heading as="h2" size="md" color="gray.700" fontWeight="600">
                            Platform Overview
                        </Heading>
                    </Flex>
                    {isLoadingStats ? (
                        <StatsGridSkeleton count={4} />
                    ) : stats && (
                        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={5}>
                            <DataCard
                                label="Total Tenants"
                                value={stats.tenants_total ?? 0}
                                icon={Building2}
                                iconColor="purple.500"
                                iconBg="purple.50"
                                isLoading={isLoadingStats}
                            />
                            <DataCard
                                label="Total Services"
                                value={stats.services_total ?? 0}
                                icon={Briefcase}
                                iconColor="blue.500"
                                iconBg="blue.50"
                                isLoading={isLoadingStats}
                            />
                            <DataCard
                                label="Total Clients"
                                value={stats.clients_total ?? 0}
                                icon={Users}
                                iconColor="green.500"
                                iconBg="green.50"
                                isLoading={isLoadingStats}
                            />
                            <DataCard
                                label="Total Appointments"
                                value={stats.appointments_total ?? 0}
                                icon={CalendarCheck}
                                iconColor="orange.500"
                                iconBg="orange.50"
                                isLoading={isLoadingStats}
                            />
                        </SimpleGrid>
                    )}
                </Box>
            )}

            {userRole !== 'super_admin' ? (
                <SimpleGrid columns={{ base: 1, xl: 3 }} gap={6} mb={8} alignItems="start">
                    {/* Main column */}
                    <VStack spacing={6} align="stretch" gridColumn={{ xl: 'span 2' }}>
                        <Box>
                            <Heading as="h2" size="md" color="gray.700" fontWeight="600" mb={4}>
                                Today's Snapshot
                            </Heading>
                            {isLoadingStats ? (
                                <StatsGridSkeleton count={4} />
                            ) : stats ? (
                                <SimpleGrid columns={{ base: 1, sm: 2 }} gap={5}>
                                    <DataCard
                                        label="Expected Revenue"
                                        value={formatCurrency(stats.expected_revenue_today)}
                                        unit="DH"
                                        change={stats.revenue_change_today}
                                        changeLabel="vs yesterday"
                                        icon={DollarSign}
                                        iconColor="brand.600"
                                        iconBg="brand.50"
                                        variant="primary"
                                    />
                                    <DataCard
                                        label="Appointments Today"
                                        value={stats.appointments_today ?? '—'}
                                        change={stats.appointments_change_today}
                                        changeLabel="vs yesterday"
                                        icon={CalendarCheck}
                                        iconColor="blue.500"
                                        iconBg="blue.50"
                                    />
                                    <DataCard
                                        label="Pending Appointments"
                                        value={stats.pending_appointments_total ?? '—'}
                                        icon={Clock}
                                        iconColor="yellow.600"
                                        iconBg="yellow.50"
                                        subtitle="Awaiting confirmation"
                                    />
                                    <DataCard
                                        label="Unconfirmed Clients"
                                        value={stats.unconfirmed_clients_total ?? '—'}
                                        icon={Users}
                                        iconColor="red.500"
                                        iconBg="red.50"
                                        subtitle="Need follow-up"
                                    />
                                </SimpleGrid>
                            ) : null}
                        </Box>
                    </VStack>

                    {/* Right rail */}
                    <VStack spacing={4} align="stretch">
                        <Box>
                            <Flex align="center" justify="space-between" mb={3}>
                                <Flex align="center" gap={2}>
                                    <Icon as={CalendarDays} boxSize="5" color="brand.500" strokeWidth={1.5} />
                                    <Heading as="h2" size="sm" color="gray.700" fontWeight="700">
                                        Today's Agenda
                                    </Heading>
                                    {todaysAppointments.length > 0 && (
                                        <Badge colorScheme="brand" borderRadius="full" px={2} fontSize="xs" fontWeight="600">
                                            {todaysAppointments.length}
                                        </Badge>
                                    )}
                                </Flex>
                                <ChakraButton
                                    variant="ghost"
                                    size="xs"
                                    colorScheme="brand"
                                    rightIcon={<ArrowRight size={13} />}
                                    onClick={() => navigate('/dashboard/calendar')}
                                    fontWeight="500"
                                >
                                    Calendar
                                </ChakraButton>
                            </Flex>

                            {loadingAppointments ? (
                                <VStack spacing={2}>
                                    {[1, 2, 3].map(i => (
                                        <Skeleton key={i} height="64px" borderRadius="xl" w="full" />
                                    ))}
                                </VStack>
                            ) : todaysAppointments.length === 0 ? (
                                <Box
                                    bg="white"
                                    p={6}
                                    borderRadius="xl"
                                    border="1px solid"
                                    borderColor="gray.200"
                                    textAlign="center"
                                >
                                    <Icon as={Sparkles} boxSize="7" color="gray.300" strokeWidth={1.5} mb={2} />
                                    <Text color="gray.500" fontSize="sm" fontWeight="500">No appointments today</Text>
                                    <ChakraButton
                                        size="sm"
                                        variant="outline"
                                        mt={3}
                                        onClick={() => navigate('/dashboard/calendar')}
                                    >
                                        Open Calendar
                                    </ChakraButton>
                                </Box>
                            ) : (
                                <VStack spacing={0} align="stretch">
                                    {nextUpcomingAppointment && (
                                        <Box
                                            bg="brand.50"
                                            border="1px solid"
                                            borderColor="brand.200"
                                            borderRadius="xl"
                                            p={3.5}
                                            mb={3}
                                            cursor="pointer"
                                            onClick={() => onAppointmentClick?.(nextUpcomingAppointment)}
                                            transition="all 0.2s"
                                            _hover={{ shadow: 'md', borderColor: 'brand.300' }}
                                        >
                                            <HStack justify="space-between" mb={2}>
                                                <Badge colorScheme="brand" borderRadius="full" px={2} fontSize="2xs" fontWeight="700">
                                                    NEXT UP
                                                </Badge>
                                                <Text fontSize="xs" color="brand.600" fontWeight="600">
                                                    {formatTime(nextUpcomingAppointment.appointment_time)}
                                                </Text>
                                            </HStack>
                                            <Text fontSize="sm" fontWeight="600" color="gray.800" noOfLines={1}>
                                                {nextUpcomingAppointment.client_name || 'Walk-in'}
                                            </Text>
                                            <Text fontSize="xs" color="brand.600" noOfLines={1}>
                                                {nextUpcomingAppointment.services?.map((s: any) => s.name).join(', ') || 'No services'}
                                            </Text>
                                        </Box>
                                    )}

                                    <Box
                                        bg="white"
                                        borderRadius="xl"
                                        border="1px solid"
                                        borderColor="gray.200"
                                        overflow="hidden"
                                    >
                                        {todaysAppointments.slice(0, 5).map((appt, idx) => {
                                            const isNext = nextUpcomingAppointment && appt.id === nextUpcomingAppointment.id;
                                            return (
                                                <Box key={appt.id}>
                                                    {idx > 0 && <Divider borderColor="gray.100" />}
                                                    <HStack
                                                        px={3.5}
                                                        py={3}
                                                        spacing={3}
                                                        cursor="pointer"
                                                        onClick={() => onAppointmentClick?.(appt)}
                                                        transition="all 0.15s"
                                                        _hover={{ bg: 'gray.50' }}
                                                    >
                                                        <Text
                                                            fontSize="xs"
                                                            fontWeight="600"
                                                            color={isNext ? 'brand.600' : 'gray.500'}
                                                            fontFamily="mono"
                                                            minW="42px"
                                                        >
                                                            {formatTime(appt.appointment_time)}
                                                        </Text>
                                                        <Box flex={1} minW={0}>
                                                            <Text fontSize="sm" fontWeight="500" color="gray.800" noOfLines={1}>
                                                                {appt.client_name || 'Walk-in'}
                                                            </Text>
                                                            <Text fontSize="2xs" color="gray.500" noOfLines={1}>
                                                                {appt.services?.map((s: any) => s.name).join(', ') || '—'}
                                                            </Text>
                                                        </Box>
                                                        <Badge
                                                            colorScheme={getStatusColor(appt.status)}
                                                            borderRadius="full"
                                                            px={2}
                                                            fontSize="2xs"
                                                            fontWeight="600"
                                                            textTransform="none"
                                                        >
                                                            {getStatusLabel(appt.status)}
                                                        </Badge>
                                                    </HStack>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </VStack>
                            )}
                        </Box>

                        <Box bg="white" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200">
                            <HStack spacing={2} mb={3}>
                                <Icon as={AlertTriangle} boxSize={4} color="orange.500" />
                                <Text fontSize="sm" fontWeight="700" color="gray.700">Needs Attention</Text>
                            </HStack>
                            <VStack spacing={2} align="stretch">
                                {needsAttentionItems.map((item) => (
                                    <HStack
                                        key={item.label}
                                        justify="space-between"
                                        p={2.5}
                                        borderRadius="lg"
                                        bg="gray.50"
                                        borderWidth="1px"
                                        borderColor="gray.100"
                                    >
                                        <Box>
                                            <Text fontSize="xs" color="gray.500">{item.label}</Text>
                                            <Text fontSize="md" fontWeight="700" color="gray.800">{item.value}</Text>
                                        </Box>
                                        <ChakraButton size="xs" variant="outline" onClick={item.onClick}>
                                            {item.actionLabel}
                                        </ChakraButton>
                                    </HStack>
                                ))}
                            </VStack>
                        </Box>

                        <Box bg="white" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200">
                            <Text fontSize="sm" fontWeight="700" color="gray.700" mb={3}>Quick Actions</Text>
                            <VStack spacing={2} align="stretch">
                                <ChakraButton size="sm" variant="outline" onClick={() => navigate('/dashboard/calendar')}>
                                    Open Calendar
                                </ChakraButton>
                                <ChakraButton size="sm" variant="ghost" onClick={() => navigate('/dashboard/clients')}>
                                    Open Clients
                                </ChakraButton>
                            </VStack>
                        </Box>
                    </VStack>
                </SimpleGrid>
            ) : (
                <Box mb={8}>
                    <Heading as="h2" size="md" color="gray.700" fontWeight="600" mb={4}>
                        Today's Snapshot
                    </Heading>
                    {isLoadingStats ? (
                        <StatsGridSkeleton count={4} />
                    ) : stats ? (
                        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={5}>
                            <DataCard
                                label="Expected Revenue"
                                value={formatCurrency(stats.expected_revenue_today)}
                                unit="DH"
                                change={stats.revenue_change_today}
                                changeLabel="vs yesterday"
                                icon={DollarSign}
                                iconColor="brand.600"
                                iconBg="brand.50"
                                variant="primary"
                            />
                            <DataCard
                                label="Appointments Today"
                                value={stats.appointments_today ?? '—'}
                                change={stats.appointments_change_today}
                                changeLabel="vs yesterday"
                                icon={CalendarCheck}
                                iconColor="blue.500"
                                iconBg="blue.50"
                            />
                            <DataCard
                                label="Pending Appointments"
                                value={stats.pending_appointments_total ?? '—'}
                                icon={Clock}
                                iconColor="yellow.600"
                                iconBg="yellow.50"
                                subtitle="Awaiting confirmation"
                            />
                            <DataCard
                                label="Unconfirmed Clients"
                                value={stats.unconfirmed_clients_total ?? '—'}
                                icon={Users}
                                iconColor="red.500"
                                iconBg="red.50"
                                subtitle="Need follow-up"
                            />
                        </SimpleGrid>
                    ) : null}
                </Box>
            )}

            {/* Revenue Chart */}
            <Box mb={8}>
                <Heading as="h2" size="md" color="gray.700" fontWeight="600" mb={4}>
                    Revenue Trend
                </Heading>
                {isLoadingChart ? (
                    <ChartSkeleton height="280px" />
                ) : (
                    <Box
                        bg="white"
                        p={{ base: 4, md: 6 }}
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="gray.200"
                        h="280px"
                        transition="all 0.2s ease"
                        _hover={{ shadow: 'md', borderColor: 'gray.300' }}
                    >
                        {chartError ? (
                            <Center h="100%">
                                <Text color="gray.400" fontSize="sm">{chartError}</Text>
                            </Center>
                        ) : revenueChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={revenueChartData}
                                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={theme.colors.brand[500]} stopOpacity={0.15} />
                                            <stop offset="95%" stopColor={theme.colors.brand[500]} stopOpacity={0.01} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke={theme.colors.gray[100]}
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 11, fill: theme.colors.gray[400] }}
                                        axisLine={{ stroke: theme.colors.gray[200] }}
                                        tickLine={false}
                                        dy={8}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: `1px solid ${theme.colors.gray[200]}`,
                                            borderRadius: '12px',
                                            boxShadow: theme.shadows.lg,
                                            fontSize: '13px',
                                            padding: '10px 14px',
                                        }}
                                        labelStyle={{
                                            color: theme.colors.gray[700],
                                            fontWeight: 600,
                                            marginBottom: '4px',
                                        }}
                                        itemStyle={{ color: theme.colors.brand[600] }}
                                        formatter={(value: number, name: string) => [formatCurrencyForChartTooltip(value), name]}
                                        cursor={{ stroke: theme.colors.brand[200], strokeWidth: 1, strokeDasharray: '3 3' }}
                                    />
                                    <Legend
                                        verticalAlign="top"
                                        align="right"
                                        height={36}
                                        iconSize={8}
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '12px', color: theme.colors.gray[500] }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        name="Revenue (MAD)"
                                        stroke={theme.colors.brand[500]}
                                        strokeWidth={2.5}
                                        fillOpacity={1}
                                        fill="url(#colorRevenue)"
                                        activeDot={{
                                            r: 6,
                                            stroke: 'white',
                                            strokeWidth: 2.5,
                                            fill: theme.colors.brand[500],
                                        }}
                                        dot={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <Center h="100%" flexDirection="column" gap={2}>
                                <Icon as={TrendingUp} boxSize="8" color="gray.300" strokeWidth={1.5} />
                                <Text color="gray.400" fontSize="sm">No revenue data for the past 7 days</Text>
                            </Center>
                        )}
                    </Box>
                )}
            </Box>

            {/* Period-based Activity Stats */}
            {stats && !isLoadingStats && (
                <Box>
                    <Flex align="center" gap={3} mb={4} flexWrap="wrap">
                        <Flex align="center" gap={2}>
                            <Icon as={CalendarDays} boxSize="5" color="gray.500" strokeWidth={1.5} />
                            <Heading as="h2" size="md" color="gray.700" fontWeight="600">
                                Activity
                            </Heading>
                        </Flex>
                        <Select
                            value={selectedPeriod}
                            onChange={handlePeriodChange}
                            w="auto"
                            minW="180px"
                            size="sm"
                            borderRadius="lg"
                            focusBorderColor="brand.500"
                            bg="white"
                            border="1px solid"
                            borderColor="gray.200"
                            fontWeight="500"
                            _hover={{ borderColor: 'gray.300' }}
                        >
                            {(Object.keys(STATS_PERIOD_LABELS) as StatsPeriod[]).map(key => (
                                <option key={key} value={key}>{STATS_PERIOD_LABELS[key]}</option>
                            ))}
                        </Select>
                    </Flex>

                    <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={5}>
                        <DataCard
                            label="Completed"
                            value={stats.completed_appointments_period ?? '—'}
                            icon={CalendarCheck}
                            iconColor="green.500"
                            iconBg="green.50"
                            subtitle={STATS_PERIOD_LABELS[selectedPeriod]}
                        />
                        <DataCard
                            label="Revenue"
                            value={formatCurrency(stats.revenue_period)}
                            unit="DH"
                            icon={DollarSign}
                            iconColor="brand.500"
                            iconBg="brand.50"
                            subtitle={STATS_PERIOD_LABELS[selectedPeriod]}
                        />
                        <DataCard
                            label="New Clients"
                            value={stats.new_clients_period ?? '—'}
                            icon={Users}
                            iconColor="blue.500"
                            iconBg="blue.50"
                            subtitle={STATS_PERIOD_LABELS[selectedPeriod]}
                        />
                        <DataCard
                            label="Upcoming"
                            value={stats.upcoming_appointments_next_7_days ?? '—'}
                            icon={CalendarDays}
                            iconColor="purple.500"
                            iconBg="purple.50"
                            subtitle="Next 7 days"
                        />
                    </SimpleGrid>
                </Box>
            )}
        </Box>
    );
};

export default DashboardOverviewPage;
