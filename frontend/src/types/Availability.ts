// src/types/Availability.ts
export interface AvailabilityResponse {
    available_slots: string[]; // Array of "HH:MM"
    date_checked: string;      // "YYYY-MM-DD"
    timezone_queried: string;  // e.g., "America/New_York"
}
