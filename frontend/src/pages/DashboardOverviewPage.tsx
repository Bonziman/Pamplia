import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardStats, useRevenueChart, queryKeys } from '../hooks/useQueryHooks';
import { StatsPeriod, STATS_PERIOD_LABELS, DailyRevenueData } from '../types/Dashboard';
import { FetchedAppointment } from '../api/appointmentApi';
import {
  Plus,
  DollarSign,
  CalendarCheck,
  Clock,
  Users,
  Building2,
  Briefcase,
  TrendingUp,
  CalendarDays,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Timer,
  CheckCircle2,
  ListChecks,
} from 'lucide-react';

import {
  Button as ChakraButton,
  Heading,
  Flex,
  Box,
  Select,
  Text,
  Center,
  SimpleGrid,
  Icon,
  VStack,
  HStack,
  Badge,
  Divider,
  Skeleton,
  useTheme,
} from '@chakra-ui/react';
import { XAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { DataCard, StatsGridSkeleton, ChartSkeleton } from '../components/ui';
import { useLanguage } from '../i18n/languageContext';

type DashboardOverviewPageProps = {
  userName?: string;
  onOpenCreateAppointmentModal: (onCreated?: () => void) => void;
  userRole?: string;
  appointments?: FetchedAppointment[];
  loadingAppointments?: boolean;
  onAppointmentClick?: (appointment: FetchedAppointment) => void;
};

const DashboardOverviewPage: React.FC<DashboardOverviewPageProps> = ({
  userName,
  onOpenCreateAppointmentModal,
  userRole,
  appointments = [],
  loadingAppointments = false,
  onAppointmentClick,
}) => {
  const { language, locale } = useLanguage();
  const isFr = language === 'fr';
  const tx = (en: string, fr: string) => (isFr ? fr : en);

  const UI_LOCALE = locale;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState<StatsPeriod>('last_7_days');
  const theme = useTheme();

  const { data: stats, isLoading: isLoadingStats, error: statsError } = useDashboardStats(selectedPeriod);
  const { data: chartDataResponse, isLoading: isLoadingChart, error: chartQueryError } = useRevenueChart();

  const error = statsError ? (statsError as any)?.response?.data?.detail || tx('Failed to load dashboard data.', 'Echec du chargement des donnees du tableau de bord.') : null;
  const chartError = chartQueryError ? tx('Chart data is unavailable.', 'Les donnees du graphique ne sont pas disponibles.') : null;

  const revenueChartData = chartDataResponse?.trend
    ? chartDataResponse.trend.map((item: DailyRevenueData) => ({
        name: new Date(item.date).toLocaleDateString(UI_LOCALE, { month: 'short', day: 'numeric' }),
        revenue: item.revenue,
      }))
    : [];

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    return value.toFixed(2);
  };

  const formatCurrencyForChartTooltip = (value: number) => `${value.toFixed(2)} DH`;

  const normalizeStatus = (status: string | undefined | null) => {
    const statusValue = (status || '').toLowerCase();
    if (statusValue === 'completed') return 'done';
    if (statusValue === 'canceled') return 'cancelled';
    return statusValue;
  };

  const getStatusLabel = (status: string | undefined | null) => {
    const normalized = normalizeStatus(status);
    if (normalized === 'done') return tx('Completed', 'Termine');
    if (normalized === 'pending') return tx('Pending', 'En attente');
    if (normalized === 'confirmed') return tx('Confirmed', 'Confirme');
    if (normalized === 'cancelled') return tx('Cancelled', 'Annule');
    return tx('Unknown', 'Inconnu');
  };

  const getStatusColor = (status: string) => {
    switch (normalizeStatus(status)) {
      case 'confirmed':
        return 'green';
      case 'pending':
        return 'yellow';
      case 'cancelled':
        return 'red';
      case 'done':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString(UI_LOCALE, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '--:--';
    }
  };

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

  const now = new Date();

  const todaysAppointments = useMemo(() => {
    const today = new Date();
    const todayStr = today.toDateString();
    return appointments
      .filter((appt) => {
        try {
          return new Date(appt.appointment_time).toDateString() === todayStr;
        } catch {
          return false;
        }
      })
      .sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime());
  }, [appointments]);

  const nextUpcomingAppointment = useMemo(() => {
    return todaysAppointments.find((appt) => new Date(appt.appointment_time) >= now) || null;
  }, [todaysAppointments, now]);

  const pendingNext24h = useMemo(() => {
    const limit = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return appointments
      .filter((appt) => {
        const t = new Date(appt.appointment_time);
        return t >= now && t <= limit && normalizeStatus(appt.status) === 'pending';
      })
      .sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime());
  }, [appointments, now]);

  const atRiskNext6h = useMemo(() => {
    const limit = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    return pendingNext24h.filter((appt) => new Date(appt.appointment_time) <= limit);
  }, [pendingNext24h, now]);

  const appointmentRevenue = (appt: FetchedAppointment) =>
    (appt.services || []).reduce((sum, service) => sum + (Number(service.price) || 0), 0);

  const bookedValueToday = useMemo(
    () => todaysAppointments.reduce((sum, appt) => sum + appointmentRevenue(appt), 0),
    [todaysAppointments]
  );

  const completedToday = useMemo(
    () => todaysAppointments.filter((appt) => normalizeStatus(appt.status) === 'done').length,
    [todaysAppointments]
  );

  const confirmedToday = useMemo(
    () => todaysAppointments.filter((appt) => {
      const status = normalizeStatus(appt.status);
      return status === 'confirmed' || status === 'done';
    }).length,
    [todaysAppointments]
  );

  const confirmationRateToday = todaysAppointments.length > 0 ? (confirmedToday / todaysAppointments.length) * 100 : 0;

  const daypartCounts = useMemo(() => {
    const counts = {
      morning: 0,
      afternoon: 0,
      evening: 0,
    };

    todaysAppointments.forEach((appt) => {
      const h = new Date(appt.appointment_time).getHours();
      if (h < 12) counts.morning += 1;
      else if (h < 17) counts.afternoon += 1;
      else counts.evening += 1;
    });

    return counts;
  }, [todaysAppointments]);

  const peakDaypart = useMemo(() => {
    const entries = Object.entries(daypartCounts) as Array<[string, number]>;
    const [slot, count] = entries.sort((a, b) => b[1] - a[1])[0] || ['morning', 0];
    return { slot, count };
  }, [daypartCounts]);

  const topServicesToday = useMemo(() => {
    const serviceCount = new Map<string, number>();

    todaysAppointments.forEach((appt) => {
      (appt.services || []).forEach((service) => {
        const key = service.name || tx('Service', 'Service');
        serviceCount.set(key, (serviceCount.get(key) || 0) + 1);
      });
    });

    return Array.from(serviceCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [todaysAppointments]);

  const nextAppointmentLabel = useMemo(() => {
    if (!nextUpcomingAppointment) return tx('No upcoming slot', 'Aucun prochain creneau');
    const diffMs = new Date(nextUpcomingAppointment.appointment_time).getTime() - now.getTime();
    const diffMins = Math.max(0, Math.round(diffMs / 60000));
    if (diffMins < 60) return isFr ? `dans ${diffMins} min` : `in ${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return isFr ? `dans ${hours}h ${mins}m` : `in ${hours}h ${mins}m`;
  }, [nextUpcomingAppointment, now, isFr, tx]);

  const isSuperAdmin = userRole === 'super_admin';

  return (
    <Box px={{ base: 0, md: 0 }} py={0}>
      <Flex
        align={{ base: 'flex-start', md: 'center' }}
        justify="space-between"
        direction={{ base: 'column', md: 'row' }}
        gap={3}
        mb={6}
      >
        <Box>
          <Heading as="h1" size="xl" color="gray.900" fontWeight="700" letterSpacing="-0.02em">
            {tx('Hello,', 'Bonjour,')} {userName ? userName.split(' ')[0] : tx('there', 'vous')}
          </Heading>
          <Text color="gray.500" fontSize="sm" mt={1} mb={0}>
            {tx('Decision-first overview: what needs action now, what drives revenue, and what is at risk.', 'Vue operationnelle: actions immediates, moteurs de revenu et points a risque.')}
          </Text>
        </Box>

        {isSuperAdmin ? (
          <Flex gap="3" flexWrap="wrap">
            <ChakraButton colorScheme="brand" onClick={() => navigate('/dashboard/tenants')} size="md">
              {tx('Manage Tenants', 'Gerer les locataires')}
            </ChakraButton>
            <ChakraButton variant="outline" colorScheme="brand" onClick={() => navigate('/dashboard/users')} size="md">
              {tx('Manage Users', 'Gerer les utilisateurs')}
            </ChakraButton>
          </Flex>
        ) : (
          <ChakraButton
            colorScheme="brand"
            onClick={() => onOpenCreateAppointmentModal(handleAppointmentCreated)}
            leftIcon={<Plus size={16} />}
            size="md"
          >
            {tx('New Appointment', 'Nouveau rendez-vous')}
          </ChakraButton>
        )}
      </Flex>

      {error && !isLoadingStats && (
        <Box p={5} bg="red.50" color="red.700" borderRadius="xl" border="1px solid" borderColor="red.200" mb={6}>
          <Text fontWeight="600" mb={1}>{tx('Failed to load dashboard data', 'Echec du chargement des donnees du tableau de bord')}</Text>
          <Text fontSize="sm" color="red.600">{error}</Text>
          <ChakraButton colorScheme="red" variant="link" size="sm" mt={2} onClick={handleRetry}>
            {tx('Try Again', 'Reessayer')}
          </ChakraButton>
        </Box>
      )}

      {isSuperAdmin ? (
        <>
          <Box mb={8}>
            <Flex align="center" gap={2} mb={4}>
              <Icon as={Building2} boxSize="5" color="gray.500" strokeWidth={1.5} />
              <Heading as="h2" size="md" color="gray.700" fontWeight="600">
                {tx('Platform Control Center', 'Centre de controle plateforme')}
              </Heading>
            </Flex>
            {isLoadingStats ? (
              <StatsGridSkeleton count={4} />
            ) : stats && (
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={5}>
                <DataCard label={tx('Tenants', 'Locataires')} value={stats.tenants_total ?? 0} icon={Building2} iconColor="purple.500" iconBg="purple.50" />
                <DataCard label={tx('Appointments (total)', 'Rendez-vous (total)')} value={stats.appointments_total ?? 0} icon={CalendarCheck} iconColor="orange.500" iconBg="orange.50" />
                <DataCard label={tx('Clients (total)', 'Clients (total)')} value={stats.clients_total ?? 0} icon={Users} iconColor="green.500" iconBg="green.50" />
                <DataCard label={tx('Pending appointments', 'Rendez-vous en attente')} value={stats.pending_appointments_total ?? 0} icon={AlertTriangle} iconColor="yellow.600" iconBg="yellow.50" />
              </SimpleGrid>
            )}
          </Box>

          <SimpleGrid columns={{ base: 1, lg: 3 }} gap={6} mb={8}>
            <Box bg="white" p={5} borderRadius="xl" border="1px solid" borderColor="gray.200">
              <HStack spacing={2} mb={3}>
                <Icon as={ListChecks} boxSize={4} color="brand.500" />
                <Text fontSize="sm" fontWeight="700" color="gray.700">{tx('Immediate Follow-ups', 'Suivis immediats')}</Text>
              </HStack>
              <VStack spacing={2} align="stretch">
                <HStack justify="space-between" p={2.5} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.100">
                  <Box>
                    <Text fontSize="xs" color="gray.500">{tx('Pending Appointments', 'Rendez-vous en attente')}</Text>
                    <Text fontSize="md" fontWeight="700" color="gray.800">{stats?.pending_appointments_total ?? 0}</Text>
                  </Box>
                  <ChakraButton size="xs" variant="outline" onClick={() => navigate('/dashboard/tenants')}>{tx('Open', 'Ouvrir')}</ChakraButton>
                </HStack>
                <HStack justify="space-between" p={2.5} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.100">
                  <Box>
                    <Text fontSize="xs" color="gray.500">{tx('Unconfirmed Clients', 'Clients non confirmes')}</Text>
                    <Text fontSize="md" fontWeight="700" color="gray.800">{stats?.unconfirmed_clients_total ?? 0}</Text>
                  </Box>
                  <ChakraButton size="xs" variant="outline" onClick={() => navigate('/dashboard/users')}>{tx('Review', 'Verifier')}</ChakraButton>
                </HStack>
              </VStack>
            </Box>

            <Box bg="white" p={5} borderRadius="xl" border="1px solid" borderColor="gray.200" gridColumn={{ base: 'auto', lg: 'span 2' }}>
              <Heading as="h2" size="sm" color="gray.700" fontWeight="700" mb={3}>{tx('Revenue Trend', 'Tendance du revenu')}</Heading>
              {isLoadingChart ? (
                <ChartSkeleton height="260px" />
              ) : (
                <Box h="260px">
                  {chartError ? (
                    <Center h="100%"><Text color="gray.400" fontSize="sm">{chartError}</Text></Center>
                  ) : revenueChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={theme.colors.brand[500]} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={theme.colors.brand[500]} stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.gray[100]} vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.colors.gray[400] }} axisLine={{ stroke: theme.colors.gray[200] }} tickLine={false} dy={8} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: `1px solid ${theme.colors.gray[200]}`,
                            borderRadius: '12px',
                            boxShadow: theme.shadows.lg,
                            fontSize: '13px',
                            padding: '10px 14px',
                          }}
                          formatter={(value: number, name: string) => [formatCurrencyForChartTooltip(value), name]}
                        />
                        <Legend verticalAlign="top" align="right" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '12px', color: theme.colors.gray[500] }} />
                        <Area type="monotone" dataKey="revenue" name={tx('Revenue (MAD)', 'Revenu (MAD)')} stroke={theme.colors.brand[500]} strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <Center h="100%" flexDirection="column" gap={2}>
                      <Icon as={TrendingUp} boxSize="8" color="gray.300" strokeWidth={1.5} />
                      <Text color="gray.400" fontSize="sm">{tx('No revenue data for the past 7 days', 'Aucune donnee de revenu sur les 7 derniers jours')}</Text>
                    </Center>
                  )}
                </Box>
              )}
            </Box>
          </SimpleGrid>
        </>
      ) : (
        <>
          <Box mb={8}>
            <Flex align="center" gap={2} mb={4}>
              <Icon as={Timer} boxSize="5" color="brand.500" strokeWidth={1.5} />
              <Heading as="h2" size="md" color="gray.700" fontWeight="600">
                {tx('Today Control Center', 'Centre de pilotage du jour')}
              </Heading>
            </Flex>
            {isLoadingStats ? (
              <StatsGridSkeleton count={4} />
            ) : (
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={5}>
                <DataCard
                  label={tx('Next Appointment', 'Prochain rendez-vous')}
                  value={nextUpcomingAppointment ? formatTime(nextUpcomingAppointment.appointment_time) : '—'}
                  subtitle={nextAppointmentLabel}
                  icon={CalendarDays}
                  iconColor="brand.600"
                  iconBg="brand.50"
                  onClick={() => navigate('/dashboard/calendar')}
                />
                <DataCard
                  label={tx('Confirmation Rate', 'Taux de confirmation')}
                  value={todaysAppointments.length > 0 ? `${confirmationRateToday.toFixed(0)}%` : '—'}
                  subtitle={tx(`${confirmedToday}/${todaysAppointments.length || 0} appointments confirmed`, `${confirmedToday}/${todaysAppointments.length || 0} rendez-vous confirmes`)}
                  icon={CheckCircle2}
                  iconColor="green.500"
                  iconBg="green.50"
                />
                <DataCard
                  label={tx('Booked Value Today', 'Valeur reservee aujourd\'hui')}
                  value={formatCurrency(bookedValueToday)}
                  unit="DH"
                  subtitle={tx('Estimated from scheduled services', 'Estimation basee sur les services planifies')}
                  icon={DollarSign}
                  iconColor="blue.500"
                  iconBg="blue.50"
                />
                <DataCard
                  label={tx('Pending Next 24h', 'En attente prochaines 24h')}
                  value={pendingNext24h.length}
                  subtitle={atRiskNext6h.length > 0 ? tx(`${atRiskNext6h.length} in next 6h`, `${atRiskNext6h.length} dans les 6h`) : tx('No immediate risk', 'Aucun risque immediat')}
                  icon={AlertTriangle}
                  iconColor="yellow.600"
                  iconBg="yellow.50"
                  onClick={() => navigate('/dashboard/calendar')}
                />
              </SimpleGrid>
            )}
          </Box>

          <SimpleGrid columns={{ base: 1, xl: 3 }} gap={6} mb={8} alignItems="start">
            <Box gridColumn={{ xl: 'span 2' }}>
              <Flex align="center" justify="space-between" mb={3}>
                <Heading as="h2" size="sm" color="gray.700" fontWeight="700">{tx("Today's Timeline", 'Timeline du jour')}</Heading>
                <Badge colorScheme="brand" borderRadius="full" px={2}>{todaysAppointments.length}</Badge>
              </Flex>

              {loadingAppointments ? (
                <VStack spacing={2}>
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} height="68px" borderRadius="xl" w="full" />
                  ))}
                </VStack>
              ) : todaysAppointments.length === 0 ? (
                <Box bg="white" p={6} borderRadius="xl" border="1px solid" borderColor="gray.200" textAlign="center">
                  <Icon as={Sparkles} boxSize="7" color="gray.300" strokeWidth={1.5} mb={2} />
                  <Text color="gray.500" fontSize="sm" fontWeight="500">{tx('No appointments today', "Aucun rendez-vous aujourd'hui")}</Text>
                  <ChakraButton size="sm" variant="outline" mt={3} onClick={() => navigate('/dashboard/calendar')}>
                    {tx('Open Calendar', 'Ouvrir le calendrier')}
                  </ChakraButton>
                </Box>
              ) : (
                <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" overflow="hidden">
                  {todaysAppointments.map((appt, idx) => (
                    <Box key={appt.id}>
                      {idx > 0 && <Divider borderColor="gray.100" />}
                      <HStack
                        px={4}
                        py={3}
                        spacing={3}
                        cursor="pointer"
                        onClick={() => onAppointmentClick?.(appt)}
                        transition="all 0.15s"
                        _hover={{ bg: 'gray.50' }}
                        align="start"
                      >
                        <Box minW="52px">
                          <Text fontSize="xs" fontWeight="700" color="gray.700" mb={0}>{formatTime(appt.appointment_time)}</Text>
                          <Text fontSize="2xs" color="gray.400" mb={0}>#{appt.id}</Text>
                        </Box>
                        <Box flex={1} minW={0}>
                          <Text fontSize="sm" fontWeight="600" color="gray.800" noOfLines={1}>{appt.client_name || tx('Walk-in', 'Sans reservation')}</Text>
                          <Text fontSize="xs" color="gray.500" noOfLines={1}>{appt.services?.map((s: any) => s.name).join(', ') || tx('No service linked', 'Aucun service lie')}</Text>
                        </Box>
                        <VStack spacing={1} align="end">
                          <Badge colorScheme={getStatusColor(appt.status)} borderRadius="full" px={2} fontSize="2xs" textTransform="none">
                            {getStatusLabel(appt.status)}
                          </Badge>
                          <Text fontSize="2xs" color="gray.400">{formatCurrency(appointmentRevenue(appt))} DH</Text>
                        </VStack>
                      </HStack>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            <VStack spacing={4} align="stretch">
              <Box bg="white" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200">
                <HStack spacing={2} mb={3}>
                  <Icon as={ListChecks} boxSize={4} color="orange.500" />
                  <Text fontSize="sm" fontWeight="700" color="gray.700">{tx('Action Queue', "File d'action")}</Text>
                </HStack>
                {pendingNext24h.length === 0 ? (
                  <Text fontSize="sm" color="gray.500">{tx('No pending confirmations in the next 24h.', 'Aucune confirmation en attente dans les prochaines 24h.')}</Text>
                ) : (
                  <VStack spacing={2} align="stretch">
                    {pendingNext24h.slice(0, 5).map((appt) => (
                      <HStack key={appt.id} justify="space-between" p={2.5} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.100">
                        <Box>
                          <Text fontSize="xs" color="gray.500">{formatTime(appt.appointment_time)}</Text>
                          <Text fontSize="sm" fontWeight="600" color="gray.800" noOfLines={1}>{appt.client_name || tx('Walk-in', 'Sans reservation')}</Text>
                        </Box>
                        <ChakraButton size="xs" variant="outline" onClick={() => navigate('/dashboard/calendar')}>
                          {tx('Confirm', 'Confirmer')}
                        </ChakraButton>
                      </HStack>
                    ))}
                  </VStack>
                )}
              </Box>

              <Box bg="white" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200">
                <HStack spacing={2} mb={3}>
                  <Icon as={CalendarCheck} boxSize={4} color="brand.500" />
                  <Text fontSize="sm" fontWeight="700" color="gray.700">{tx('Capacity By Daypart', 'Capacite par tranche horaire')}</Text>
                </HStack>
                {(['morning', 'afternoon', 'evening'] as const).map((slot) => {
                  const count = daypartCounts[slot];
                  const pct = todaysAppointments.length > 0 ? Math.round((count / todaysAppointments.length) * 100) : 0;
                  const label = slot === 'morning' ? tx('Morning', 'Matin') : slot === 'afternoon' ? tx('Afternoon', 'Apres-midi') : tx('Evening', 'Soir');
                  return (
                    <Box key={slot} mb={2.5}>
                      <HStack justify="space-between" mb={1}>
                        <Text fontSize="xs" color="gray.600">{label}</Text>
                        <Text fontSize="xs" color="gray.500">{count} ({pct}%)</Text>
                      </HStack>
                      <Box bg="gray.100" borderRadius="full" h="7px" overflow="hidden">
                        <Box bg="brand.500" h="100%" w={`${pct}%`} />
                      </Box>
                    </Box>
                  );
                })}
                <Text fontSize="xs" color="gray.500" mt={2}>
                  {tx('Peak', 'Pic')}: {peakDaypart.slot === 'morning' ? tx('Morning', 'Matin') : peakDaypart.slot === 'afternoon' ? tx('Afternoon', 'Apres-midi') : tx('Evening', 'Soir')} ({peakDaypart.count} {tx('appointments', 'rendez-vous')})
                </Text>
              </Box>

              <Box bg="white" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200">
                <HStack spacing={2} mb={3}>
                  <Icon as={Briefcase} boxSize={4} color="blue.500" />
                  <Text fontSize="sm" fontWeight="700" color="gray.700">{tx('Top Services Today', "Top services d'aujourd'hui")}</Text>
                </HStack>
                {topServicesToday.length === 0 ? (
                  <Text fontSize="sm" color="gray.500">{tx('No service data yet for today.', "Aucune donnee service pour aujourd'hui.")}</Text>
                ) : (
                  <VStack spacing={2} align="stretch">
                    {topServicesToday.map(([service, count]) => (
                      <HStack key={service} justify="space-between" p={2.5} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.100">
                        <Text fontSize="sm" color="gray.700" noOfLines={1}>{service}</Text>
                        <Badge colorScheme="blue" borderRadius="full">{count}</Badge>
                      </HStack>
                    ))}
                  </VStack>
                )}
              </Box>
            </VStack>
          </SimpleGrid>
        </>
      )}

      <SimpleGrid columns={{ base: 1, xl: 3 }} gap={6} mb={8}>
        <Box gridColumn={{ xl: 'span 2' }}>
          <Heading as="h2" size="md" color="gray.700" fontWeight="600" mb={4}>
            {tx('Revenue Trend', 'Tendance du revenu')}
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
                  <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenueGlobal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.colors.brand[500]} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={theme.colors.brand[500]} stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.gray[100]} vertical={false} />
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
                      labelStyle={{ color: theme.colors.gray[700], fontWeight: 600, marginBottom: '4px' }}
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
                      name={tx('Revenue (MAD)', 'Revenu (MAD)')}
                      stroke={theme.colors.brand[500]}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorRevenueGlobal)"
                      activeDot={{ r: 6, stroke: 'white', strokeWidth: 2.5, fill: theme.colors.brand[500] }}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Center h="100%" flexDirection="column" gap={2}>
                  <Icon as={TrendingUp} boxSize="8" color="gray.300" strokeWidth={1.5} />
                  <Text color="gray.400" fontSize="sm">{tx('No revenue data for the past 7 days', 'Aucune donnee de revenu sur les 7 derniers jours')}</Text>
                </Center>
              )}
            </Box>
          )}
        </Box>

        {stats && !isLoadingStats && (
          <Box bg="white" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200">
            <Flex align="center" gap={2} mb={3}>
              <Icon as={CalendarDays} boxSize="4" color="gray.500" strokeWidth={1.5} />
              <Text fontSize="sm" fontWeight="700" color="gray.700">{tx('Period Activity', 'Activite de periode')}</Text>
            </Flex>
            <Select
              value={selectedPeriod}
              onChange={handlePeriodChange}
              size="sm"
              borderRadius="lg"
              focusBorderColor="brand.500"
              bg="white"
              border="1px solid"
              borderColor="gray.200"
              fontWeight="500"
              _hover={{ borderColor: 'gray.300' }}
              mb={3}
            >
              {(Object.keys(STATS_PERIOD_LABELS) as StatsPeriod[]).map((key) => (
                <option key={key} value={key}>{STATS_PERIOD_LABELS[key]}</option>
              ))}
            </Select>

            <VStack spacing={2.5} align="stretch">
              <HStack justify="space-between" p={2.5} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.100">
                <Text fontSize="sm" color="gray.700">{tx('Completed', 'Termine')}</Text>
                <Text fontSize="sm" fontWeight="700" color="gray.800">{stats.completed_appointments_period ?? '—'}</Text>
              </HStack>
              <HStack justify="space-between" p={2.5} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.100">
                <Text fontSize="sm" color="gray.700">{tx('Revenue', 'Revenu')}</Text>
                <Text fontSize="sm" fontWeight="700" color="gray.800">{formatCurrency(stats.revenue_period)} DH</Text>
              </HStack>
              <HStack justify="space-between" p={2.5} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.100">
                <Text fontSize="sm" color="gray.700">{tx('New Clients', 'Nouveaux clients')}</Text>
                <Text fontSize="sm" fontWeight="700" color="gray.800">{stats.new_clients_period ?? '—'}</Text>
              </HStack>
              <HStack justify="space-between" p={2.5} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="gray.100">
                <Text fontSize="sm" color="gray.700">{tx('Upcoming (7d)', 'A venir (7j)')}</Text>
                <Text fontSize="sm" fontWeight="700" color="gray.800">{stats.upcoming_appointments_next_7_days ?? '—'}</Text>
              </HStack>
            </VStack>
          </Box>
        )}
      </SimpleGrid>
    </Box>
  );
};

export default DashboardOverviewPage;
