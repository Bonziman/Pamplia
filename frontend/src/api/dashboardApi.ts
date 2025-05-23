// src/api/dashboardApi.ts
// --- NEW FILE ---

import axiosInstance from './axiosInstance'; // Use your configured axios instance
import { DashboardStats, StatsPeriod, RevenueChartData } from '../types/Dashboard'; // Import types (adjust path)



/**
 * Fetches dashboard statistics for the current tenant,
 * optionally filtering period-based stats by a given period.
 * Calls GET /dashboard?period=...
 */
export const fetchDashboardStats = async (period: StatsPeriod = 'last_7_days'): Promise<DashboardStats> => {
    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/dashboard?period=${period}`;
        console.log("Fetching dashboard stats from:", apiUrl);
        // Use query parameters to send the period
        const response = await axiosInstance.get<DashboardStats>(apiUrl, {
            params: { period: period }
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching dashboard stats for period ${period}:`, error);
        throw error; // Re-throw to be handled by the component
    }
};


/**
 * Fetches revenue trend data for the current tenant.
 * Calls GET /dashboard/revenue-trend
 */
export const fetchRevenueChartData = async (
    // period: 'last_7_days' | 'last_30_days' = 'last_7_days' // Make it flexible later
): Promise<RevenueChartData> => {
    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/dashboard/revenue-trend`;
        console.log("Fetching revenue chart data from:", apiUrl);
        const response = await axiosInstance.get<RevenueChartData>(apiUrl);
        return response.data;
    } catch (error) {
        console.error(`Error fetching revenue chart data:`, error);
        throw error; // Re-throw to be handled by the component
    }
   
};
