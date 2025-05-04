// src/pages/DashboardOverviewPage.tsx
// --- NEW FILE ---

import React, { useState, useEffect, useCallback } from 'react';
import { fetchDashboardStats } from '../api/dashboardApi';
import { DashboardStats, StatsPeriod, STATS_PERIOD_LABELS } from '../types/Dashboard'; // Adjust path
import StatWidget from '../components/dashboard/StatWidget'; // Adjust path
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCalendarDay, faDollarSign, faClock, faUserCheck,
    faCalendarCheck, faUsers, faCalendarAlt
} from '@fortawesome/free-solid-svg-icons'; // Example icons

import './DashboardOverviewPage.css'; // Create this CSS file

const DashboardOverviewPage: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<StatsPeriod>('last_7_days'); // Default period

    const loadStats = useCallback(async (period: StatsPeriod) => {
        setIsLoading(true);
        setError(null);
        try {
            console.log(`DashboardOverview: Fetching stats for period: ${period}`);
            const data = await fetchDashboardStats(period);
            setStats(data);
            console.log("DashboardOverview: Stats loaded", data);
        } catch (err: any) {
            console.error("Failed to load dashboard stats:", err);
            const detail = err.response?.data?.detail || err.message || "Failed to load dashboard data.";
            setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
            setStats(null); // Clear stats on error
        } finally {
            setIsLoading(false);
        }
    }, []); // Empty dependency array, relies on parameter

    // Fetch stats on mount and when period changes
    useEffect(() => {
        loadStats(selectedPeriod);
    }, [selectedPeriod, loadStats]); // Depend on selectedPeriod and the load function

    const handlePeriodChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newPeriod = event.target.value as StatsPeriod;
        setSelectedPeriod(newPeriod);
        // Data will be re-fetched by the useEffect hook
    };

    // Helper to format currency (replace with a more robust solution if needed)
    const formatCurrency = (value: number | null | undefined) => {
        if (value === null || value === undefined) return '-';
        // Use tenant's currency eventually, defaulting to MAD for now
        return `${value.toFixed(2)} MAD`;
    };


    return (
        <div className="view-section dashboard-overview-page">
            {/* Page Header */}
            <div className="view-header dashboard-overview-header">
                <h1>Dashboard Overview</h1>
                 {/* Add other header elements if needed */}
            </div>

            {/* Display loading or error state */}
            {isLoading && !stats && ( // Show initial loading state
                <div className="loading-message">Loading dashboard data...</div>
            )}
            {error && (
                <div className="error-message alert alert-danger">{error}</div>
            )}

            {/* --- Fixed Stats Section --- */}
            <section className="dashboard-section fixed-stats">
                <h2>Today & Immediate Actions</h2>
                <div className="widgets-container">
                    <StatWidget
                        label="Appointments Today"
                        value={stats?.appointments_today}
                        icon={faCalendarDay}
                        isLoading={isLoading}
                    />
                    <StatWidget
                        label="Expected Revenue Today"
                        value={formatCurrency(stats?.expected_revenue_today)}
                        // unit="MAD" // Included in formatted string
                        icon={faDollarSign}
                        isLoading={isLoading}
                    />
                     <StatWidget
                        label="Pending Appointments"
                        value={stats?.pending_appointments_total}
                        icon={faClock}
                        isLoading={isLoading}
                        isClickable={true}
                        linkTo="/dashboard/appointments" // Route to appointments list
                        linkState={{ preFilter: { status: 'pending' } }} // Pass filter state
                    />
                     <StatWidget
                        label="Unconfirmed Clients"
                        value={stats?.unconfirmed_clients_total}
                        icon={faUserCheck}
                        isLoading={isLoading}
                        isClickable={true}
                        linkTo="/dashboard/clients" // Route to clients list
                        linkState={{ preFilter: { is_confirmed: false } }} // Pass filter state
                    />
                </div>
            </section>


             {/* --- Period Selector --- */}
             <section className="dashboard-section period-selector-section">
                 <div className="period-selector">
                     <label htmlFor="stats-period">Show Stats For:</label>
                     <select
                         id="stats-period"
                         value={selectedPeriod}
                         onChange={handlePeriodChange}
                         disabled={isLoading}
                         className="form-select" // Use common form style
                     >
                         {(Object.keys(STATS_PERIOD_LABELS) as StatsPeriod[]).map(key => (
                            <option key={key} value={key}>
                                {STATS_PERIOD_LABELS[key]}
                            </option>
                         ))}
                     </select>
                 </div>
             </section>

            {/* --- Period-Based Stats Section --- */}
             <section className="dashboard-section period-stats">
                 <h2>Activity for {STATS_PERIOD_LABELS[selectedPeriod]}</h2>
                 <div className="widgets-container">
                    <StatWidget
                        label="Completed Appointments"
                        value={stats?.completed_appointments_period}
                        icon={faCalendarCheck}
                        isLoading={isLoading}
                        // isClickable={true} linkTo="/dashboard/appointments" linkState={{ preFilter: { status: 'done', period: selectedPeriod } }}
                    />
                     <StatWidget
                        label="Revenue"
                        value={formatCurrency(stats?.revenue_period)}
                        icon={faDollarSign}
                        isLoading={isLoading}
                    />
                     <StatWidget
                        label="New Clients"
                        value={stats?.new_clients_period}
                        icon={faUsers}
                        isLoading={isLoading}
                         // isClickable={true} linkTo="/dashboard/clients" linkState={{ preFilter: { period: selectedPeriod } }}
                    />
                    {/* Add placeholder or empty widget if needed for layout */}
                     <StatWidget
                        label="Upcoming (Next 7 Days)"
                        value={stats?.upcoming_appointments_next_7_days}
                        icon={faCalendarAlt}
                        isLoading={isLoading}
                        isClickable={true}
                        linkTo="/dashboard/appointments"
                        linkState={{ preFilter: { dateRange: 'next_7_days', status: ['pending', 'confirmed'] } }} // Pass filter state
                    />
                 </div>
             </section>

            {/* Add more sections or charts later */}

        </div>
    );
};

export default DashboardOverviewPage;
