// src/pages/DashboardOverviewPage.tsx
// --- UPDATED for 2/3 stats, 1/3 chart layout & actual chart data fetching ---

import React, { useState, useEffect, useCallback } from 'react';
import { fetchDashboardStats, fetchRevenueChartData } from '../api/dashboardApi'; // Import new fetch function
import { DashboardStats, StatsPeriod, STATS_PERIOD_LABELS, DailyRevenueData } from '../types/Dashboard'; // Import new types
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import './DashboardOverviewPage.css'; // Keeping this for your .view-section class

import {
  Stat, StatLabel, Spinner, StatNumber, StatHelpText, StatArrow, StatGroup,
  Button as ChakraButton, Heading, Flex, Box, Select, Text, Icon as ChakraIcon, Center,
  Grid, GridItem, // Using Grid for the 2-column layout
  useTheme, // To access theme colors for chart styling
} from '@chakra-ui/react';
// Import chart components from recharts
import {  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

type DashboardOverviewPageProps = {
    userName?: string;
    onOpenCreateAppointmentModal: () => void;
};

const DashboardOverviewPage: React.FC<DashboardOverviewPageProps> = ({ userName, onOpenCreateAppointmentModal }) => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true); // Specific loading for main stats
    const [error, setError] = useState<string | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<StatsPeriod>('last_7_days');

    // State for Revenue Chart
    const [revenueChartData, setRevenueChartData] = useState<Array<{ name: string; revenue: number }>>([]);
    const [isLoadingChart, setIsLoadingChart] = useState<boolean>(true);
    const [chartError, setChartError] = useState<string | null>(null);

    const theme = useTheme(); // Access Chakra theme for chart colors

    // Combined loading state for the initial full page spinner
    const isPageLoading = isLoadingStats && isLoadingChart;


    const loadDashboardData = useCallback(async (periodForStats: StatsPeriod) => {
        setIsLoadingStats(true);
        setIsLoadingChart(true); // Assume we always refresh chart with main stats, or separate if needed
        setError(null);
        setChartError(null);

        try {
            const [statsData, chartDataResponse] = await Promise.all([
                fetchDashboardStats(periodForStats),
                fetchRevenueChartData() // Assuming it fetches "last_7_days" by default
            ]);

            setStats(statsData);

            if (chartDataResponse && chartDataResponse.trend) {
                const formattedChartData = chartDataResponse.trend.map((item: DailyRevenueData) => ({
                    name: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), // e.g., "Oct 23"
                    revenue: item.revenue,
                }));
                console.log("Formatted Chart Data for Recharts:", formattedChartData);
                setRevenueChartData(formattedChartData);
            } else {
                setRevenueChartData([]);
                setChartError("Chart data is unavailable.");
            }

        } catch (err: any) {
            console.error("Failed to load dashboard data:", err);
            const detail = err.response?.data?.detail || err.message || "Failed to load initial dashboard data.";
            setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
            setStats(null);
            setRevenueChartData([]);
            // If one fails, the other might have succeeded, but a general error is probably best
        } finally {
            setIsLoadingStats(false);
            setIsLoadingChart(false);
        }
    }, []); // Removed selectedPeriod from deps, pass it directly or handle updates differently

    // Fetch stats on mount
    useEffect(() => {
        loadDashboardData(selectedPeriod);
    }, [loadDashboardData, selectedPeriod]); // Reload all if selectedPeriod changes

    const handlePeriodChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newPeriod = event.target.value as StatsPeriod;
        setSelectedPeriod(newPeriod);
        // loadDashboardData will be called by the useEffect above
    };

    const handleAppointmentCreated = useCallback(() => {
        console.log("Dashboard: Appointment created signal received. Refreshing data...");
        // Reload data with the current selected period
        loadDashboardData(selectedPeriod);
        // You could also show a small toast notification here if desired
        // toast({ title: "Dashboard Updated", status: "info", duration: 2000 });
    }, [loadDashboardData, selectedPeriod]); // Dependencies: loadDashboardData and selectedPeriod

    const formatCurrency = (value: number | null | undefined, withSymbol = true) => {
        if (value === null || value === undefined) return '-';
        const formattedValue = value.toFixed(2);
        if (withSymbol) {
            return (
                <>
                {formattedValue} <Text as="span" fontSize="sm" color="gray.600" ml="1">DH</Text>
                </>
            );
        }
        return formattedValue;
    };
     const formatCurrencyForChartTick = (value: number) => `${value}`; // Just number for Y-axis
     const formatCurrencyForChartTooltip = (value: number) => `${value.toFixed(2)} DH`;


    const renderStatsAndChart = () => {
        if (!stats) return null; // If stats are null (e.g. after an error, or before first successful load)
            
            
        console.log("CHART RENDER DEBUG:", {
        isLoadingChart,
        chartError,
        revenueChartDataLength: revenueChartData?.length
        });
        
        return (
            <Grid
                templateColumns={{ base: "1fr", lg: "2fr 1fr" }}
                gap={{ base: "6", md: "8" }}
                mb={{ base: "6", md: "8" }}
            >
                {/* Left Column: Fixed Stats */}
                <GridItem className="fixed-stats-container">
                    <Heading as="h2" size="lg" mb="4" color="gray.700">
                        Today's Snapshot
                    </Heading>
                    <StatGroup h="auto" gap={{ base: "4", md: "5" }} flexWrap="wrap">
                        <Stat bg="white" borderWidth="1px" borderColor="gray.200" boxShadow="sm" borderRadius="lg" p="5" flex="1" minW={{ base: "100%", sm: "calc(50% - 10px)", md: "200px" }}>
                            <StatLabel color="gray.500" fontSize="sm">Today's Expected Revenue</StatLabel>
                            <StatNumber fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" mt="1">{formatCurrency(stats.expected_revenue_today)}</StatNumber>
                            <StatHelpText mt="2" fontSize="xs" color={stats.revenue_change_today !== undefined && stats.revenue_change_today < 0 ? "red.500" : "green.500"}>
                                <StatArrow type={stats.revenue_change_today !== undefined && stats.revenue_change_today < 0 ? 'decrease' : 'increase'} />
                                {stats.revenue_change_today !== undefined && stats.revenue_change_today !== null ? `${stats.revenue_change_today.toFixed(1)}%` : '-'} vs yesterday
                            </StatHelpText>
                        </Stat>
                        <Stat bg="white" borderWidth="1px" borderColor="gray.200" boxShadow="sm" borderRadius="lg" p="5" flex="1" minW={{ base: "100%", sm: "calc(50% - 10px)", md: "200px" }}>
                            <StatLabel color="gray.500" fontSize="sm">Appointments Today</StatLabel>
                            <StatNumber fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" mt="1">{stats.appointments_today ?? '-'}</StatNumber>
                            <StatHelpText mt="2" fontSize="xs" color={stats.appointments_change_today !== undefined && stats.appointments_change_today < 0 ? "red.500" : "green.500"}>
                                <StatArrow type={stats.appointments_change_today !== undefined && stats.appointments_change_today < 0 ? 'decrease' : 'increase'} />
                                {stats.appointments_change_today !== undefined && stats.appointments_change_today !== null ? `${stats.appointments_change_today.toFixed(1)}%` : '-'} vs yesterday
                            </StatHelpText>
                        </Stat>
                        <Stat bg="white" borderWidth="1px" borderColor="gray.200" boxShadow="sm" borderRadius="lg" p="5" flex="1" minW={{ base: "100%", sm: "calc(50% - 10px)", md: "200px" }}>
                            <StatLabel color="gray.500" fontSize="sm">Pending Appointments</StatLabel>
                            <StatNumber fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" mt="1">{stats.pending_appointments_total ?? '-'}</StatNumber>
                            {/* <StatHelpText mt="2" fontSize="xs">- %</StatHelpText> */}
                        </Stat>
                        <Stat bg="white" borderWidth="1px" borderColor="gray.200" boxShadow="sm" borderRadius="lg" p="5" flex="1" minW={{ base: "100%", sm: "calc(50% - 10px)", md: "200px" }}>
                            <StatLabel color="gray.500" fontSize="sm">Unconfirmed Clients</StatLabel>
                            <StatNumber fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" mt="1">{stats.unconfirmed_clients_total ?? '-'}</StatNumber>
                            {/* <StatHelpText mt="2" fontSize="xs">- %</StatHelpText> */}
                        </Stat>
                    </StatGroup>
                </GridItem>

                {/* Right Column: Earnings Chart */}
                <GridItem className="earnings-chart-container">
    <Heading as="h2" size="lg" mb="4" color="gray.700">
        Revenue Trend
    </Heading>
    <Box 
        bg="white" 
        p="5" 
        borderRadius="lg" 
        boxShadow="sm" 
        borderWidth="1px" 
        borderColor="gray.200" 
        // Ensure this Box has a defined height for ResponsiveContainer to work well
        // Let's give it a fixed height that looks good, ResponsiveContainer will fill this.
        h="220px" // Or use minH if you prefer and ensure content can push it
    >
        {isLoadingChart ? (
            <Center h="100%"><Spinner color="brand.500" size="lg"/></Center>
        ) : chartError ? (
            <Center h="100%"><Text color="red.500" textAlign="center">{chartError}</Text></Center>
        ) : revenueChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
                {/* Option 1: Enhanced Line Chart */}
                {/*<LineChart 
                    data={revenueChartData} 
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }} // Adjusted margins
                >
                    <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke={theme.colors.gray[200]} 
                        vertical={false} // Only horizontal grid lines for cleaner look
                    />
                    <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10, fill: theme.colors.gray[500] }} 
                        axisLine={{ stroke: theme.colors.gray[300] }}
                        tickLine={{ stroke: theme.colors.gray[300] }}
                        dy={5} // Pushes ticks down a bit
                    />
                    <YAxis 
                        tickFormatter={formatCurrencyForChartTick} 
                        tick={{ fontSize: 10, fill: theme.colors.gray[500] }}
                        axisLine={false} // Hide Y-axis line for cleaner look
                        tickLine={false} // Hide Y-axis tick lines
                        width={40} // Give some space for Y-axis labels
                    />
                    <Tooltip
                        contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                            borderColor: theme.colors.gray[300],
                            borderRadius: theme.radii.md,
                            boxShadow: theme.shadows.md,
                            fontSize: '12px',
                            padding: '8px 12px'
                        }}
                        labelStyle={{ color: theme.colors.gray[700], fontWeight: theme.fontWeights.semibold, marginBottom: '4px' }}
                        itemStyle={{ color: theme.colors.brand[600] }}
                        formatter={(value: number, name: string) => [formatCurrencyForChartTooltip(value), name]}
                        cursor={{ stroke: theme.colors.brand[200], strokeWidth: 1, strokeDasharray: '3 3' }}
                    />
                    <Legend 
                        verticalAlign="top" 
                        align="right" 
                        height={36}
                        iconSize={10}
                        wrapperStyle={{ fontSize: "12px", color: theme.colors.gray[600] }}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        name="Revenue" 
                        stroke={theme.colors.brand[500]} // Your brand color
                        strokeWidth={2.5} // Slightly thicker line
                        dot={{ r: 3, strokeWidth: 1, fill: theme.colors.brand[500] }} // Smaller dots
                        activeDot={{ r: 7, stroke: theme.colors.brand[100], strokeWidth: 3, fill: theme.colors.brand[500] }} // Larger, styled active dot
                    />
                </LineChart>*/}

                {/* Option 2: Area Chart (Uncomment to try this, comment out LineChart above) */}
                 <AreaChart
                    data={revenueChartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={theme.colors.brand[500]} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={theme.colors.brand[500]} stopOpacity={0.1}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.gray[200]} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: theme.colors.gray[500] }} axisLine={{ stroke: theme.colors.gray[300] }} tickLine={{ stroke: theme.colors.gray[300] }} dy={5} />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderColor: theme.colors.gray[300], borderRadius: theme.radii.md, boxShadow: theme.shadows.md, fontSize: '12px', padding: '8px 12px' }}
                        labelStyle={{ color: theme.colors.gray[700], fontWeight: theme.fontWeights.semibold, marginBottom: '4px' }}
                        itemStyle={{ color: theme.colors.brand[600] }}
                        formatter={(value: number, name: string) => [formatCurrencyForChartTooltip(value), name]}
                        cursor={{ stroke: theme.colors.brand[200], strokeWidth: 1, strokeDasharray: '3 3' }}
                    />
                    <Legend verticalAlign="top" align="right" height={36} iconSize={10} wrapperStyle={{ fontSize: "12px", color: theme.colors.gray[600] }}/>
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke={theme.colors.brand[500]} strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 7, stroke: theme.colors.brand[100], strokeWidth: 3, fill: theme.colors.brand[500] }} dot={{ r: 2, strokeWidth: 2, fill: theme.colors.brand[500] }}/>
                </AreaChart> 
            </ResponsiveContainer>
        ) : (
            <Center h="100%"><Text color="gray.500">No revenue data for the past 7 days.</Text></Center>
        )}
    </Box>
</GridItem>
            </Grid>
        );
    };

    const renderPeriodStatsSection = () => {
        if (!stats || isLoadingStats) return null; // Don't render if main stats are loading or null

        const hasDisplayablePeriodStats =
            stats.completed_appointments_period !== undefined ||
            stats.revenue_period !== undefined ||
            stats.new_clients_period !== undefined ||
            stats.upcoming_appointments_next_7_days !== undefined;

        return (
            <Box as="section" className="dashboard-section period-content">
                <Flex alignItems="center" gap="3" mb={{ base: "4", md: "6" }} flexWrap="wrap">
                    <Text fontWeight="medium" color="gray.700">Activity for:</Text>
                    <Select
                        id="stats-period" value={selectedPeriod} onChange={handlePeriodChange}
                        w="auto" minW="180px" size="md" borderRadius="md" focusBorderColor="brand.500" bg="white"
                        isDisabled={isLoadingStats} // Disable when these specific stats are reloading
                    >
                        {(Object.keys(STATS_PERIOD_LABELS) as StatsPeriod[]).map(key => (
                            <option key={key} value={key}>{STATS_PERIOD_LABELS[key]}</option>
                        ))}
                    </Select>
                </Flex>

                {hasDisplayablePeriodStats ? (
                    <StatGroup gap={{ base: "4", md: "5" }} flexDirection={{ base: "column", sm: "row" }} flexWrap="wrap">
                        <Stat bg="ui.topbarBg" p="5" borderRadius="lg" boxShadow="sm" flex="1" minW={{base: "100%", sm: "calc(50% - 10px)", md:"200px"}}>
                            <StatLabel color="gray.600" fontSize="sm">Completed Appointments</StatLabel>
                            <StatNumber fontSize={{ base: "xl", md: "2xl" }} mt="1" fontWeight="semibold">{stats.completed_appointments_period ?? '-'}</StatNumber>
                        </Stat>
                        <Stat bg="ui.topbarBg" p="5" borderRadius="lg" boxShadow="sm" flex="1" minW={{base: "100%", sm: "calc(50% - 10px)", md:"200px"}}>
                            <StatLabel color="gray.600" fontSize="sm">Revenue ({STATS_PERIOD_LABELS[selectedPeriod]})</StatLabel>
                            <StatNumber fontSize={{ base: "xl", md: "2xl" }} mt="1" fontWeight="semibold">{formatCurrency(stats.revenue_period)}</StatNumber>
                        </Stat>
                        <Stat bg="ui.topbarBg" p="5" borderRadius="lg" boxShadow="sm" flex="1" minW={{base: "100%", sm: "calc(50% - 10px)", md:"200px"}}>
                            <StatLabel color="gray.600" fontSize="sm">New Clients ({STATS_PERIOD_LABELS[selectedPeriod]})</StatLabel>
                            <StatNumber fontSize={{ base: "xl", md: "2xl" }} mt="1" fontWeight="semibold">{stats.new_clients_period ?? '-'}</StatNumber>
                        </Stat>
                        <Stat bg="ui.topbarBg" p="5" borderRadius="lg" boxShadow="sm" flex="1" minW={{base: "100%", sm: "calc(50% - 10px)", md:"200px"}}>
                            <StatLabel color="gray.600" fontSize="sm">Upcoming (Next 7 Days)</StatLabel>
                            <StatNumber fontSize={{ base: "xl", md: "2xl" }} mt="1" fontWeight="semibold">{stats.upcoming_appointments_next_7_days ?? '-'}</StatNumber>
                        </Stat>
                    </StatGroup>
                ) : (
                    <Text mt="4" color="gray.500">No activity data to display for {STATS_PERIOD_LABELS[selectedPeriod]}.</Text>
                )}
            </Box>
        );
    };

    return (
        // Retaining your outermost div with specified class names
        <div className="view-section dashboard-overview-page">
            <Flex alignItems="center" justifyContent="space-between" mb={{ base: "6", md: "8" }}>
                <Heading as="h1" size="xl" color="gray.800" fontWeight="bold">
                    Hello {userName ? userName.split(' ')[0] : 'there'}!
                </Heading>
                <ChakraButton
                    colorScheme="brand"
                    onClick={() => onOpenCreateAppointmentModal(handleAppointmentCreated)}
                    leftIcon={<ChakraIcon as={FontAwesomeIcon} icon={faPlus} />}
                    size="md"
                >
                    New Appointment
                </ChakraButton>
            </Flex>

            {isPageLoading ? ( // Use combined loading state for the initial big spinner
                <Center h="400px">
                    <Spinner color='brand.500' size='xl' thickness='4px' speed='0.65s' emptyColor='gray.200' />
                </Center>
            ) : error ? ( // If there was a general error fetching initial data
                 <Box p="4" bg="red.100" color="red.700" borderRadius="md" mt="0" textAlign="center" border="1px solid" borderColor="red.300">
                    <Text fontWeight="bold" mb="2">Failed to load dashboard data</Text>
                    <Text fontSize="sm">{error}</Text>
                     <ChakraButton colorScheme="red" variant="link" size="sm" mt="3" onClick={() => loadDashboardData(selectedPeriod)}>
                        Try Again
                    </ChakraButton>
                </Box>
            ) : (
                <>
                    {renderStatsAndChart()}
                    {renderPeriodStatsSection()}
                </>
            )}
        </div>
    );
};

export default DashboardOverviewPage;
