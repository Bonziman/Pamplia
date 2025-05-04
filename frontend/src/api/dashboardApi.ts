// src/api/dashboardApi.ts
// --- NEW FILE ---

import axiosInstance from './axiosInstance'; // Use your configured axios instance
import { DashboardStats, StatsPeriod } from '../types/Dashboard'; // Import types (adjust path)


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
