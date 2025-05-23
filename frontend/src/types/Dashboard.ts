// src/types/Dashboard.ts
// --- NEW FILE ---

export interface DashboardStats {
  // Fixed Widgets (No date range applied)
  appointments_today: number;
  expected_revenue_today: number; // Assuming backend sends number
  pending_appointments_total: number;
  unconfirmed_clients_total: number;
  upcoming_appointments_next_7_days: number; // Fixed forward look

  // Period-based Widgets (Affected by selected period)
  selected_period: string; // e.g., 'last_7_days', 'this_month' - echo back the period used
  completed_appointments_period: number;
  revenue_period: number; // Assuming backend sends number
  new_clients_period: number;
  appointments_change_today: number; // Percentage change from yesterday to today
  revenue_change_today: number; // Percentage change from yesterday to today
  // Add any other stats the backend might provide
}

// Define valid period keys for the selector and API query param
export type StatsPeriod = 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'all_time';

// Optional: Map period keys to display labels
export const STATS_PERIOD_LABELS: Record<StatsPeriod, string> = {
  yesterday: 'Yesterday',
  last_7_days: 'Last 7 Days',
  last_30_days: 'Last 30 Days',
  this_month: 'This Month',
  last_month: 'Last Month',
  all_time: 'All Time',
};


export interface DailyRevenueData { // For frontend use, date might be string for chart labels
    date: string; // YYYY-MM-DD string from backend
    revenue: number;
}

export interface RevenueChartData { // This is what the backend endpoint will return
    trend: DailyRevenueData[];
}
