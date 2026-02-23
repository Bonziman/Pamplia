// src/api/publicApi.ts
// --- FULL REPLACEMENT ---

import axios from "axios";
import { AvailabilityResponse } from '../types/Availability';
import axiosInstance from "./axiosInstance";
import { buildApiUrl } from "./apiBase";

// --- Type Definitions ---

export interface PublicService {
    id: number;
    name: string;
    description?: string;
    duration_minutes: number;
    price: number;
    tenant_id: number; // Backend includes this, useful for component logic later
}

// Payload for creating appointment
export interface AppointmentCreatePayload {
    client_name: string;
    client_email: string;
    client_phone?: string;
    appointment_time: string; // ISO Format string
    service_ids: number[];
    status?: string; // Optional: backend should handle default
}

// --- Helper to extract subdomain from current hostname ---
const getSubdomainFromHostname = (): string => {
    const hostname = window.location.hostname;
    const baseDomain = process.env.REACT_APP_BASE_DOMAIN || '';
    if (baseDomain && hostname.endsWith(baseDomain) && hostname !== baseDomain) {
        return hostname.replace(`.${baseDomain}`, '');
    }
    // Fallback: first segment of hostname
    return hostname.split('.')[0];
};

// --- API Functions ---

/**
 * Fetches services for the tenant identified by the subdomain query parameter.
 * Calls the backend endpoint: GET /services/tenant?subdomain=xxx
 */
export const fetchTenantServices = async (): Promise<PublicService[]> => {
    try {
        const subdomain = getSubdomainFromHostname();
        const apiUrl = buildApiUrl("/services/tenant/");
        const response = await axios.get<PublicService[]>(apiUrl, {
            params: { subdomain }
        });
        return response.data;
    } catch (error) {
        return [];
    }
};


/**
 * Creates a new public appointment.
 * Calls the backend endpoint: POST /appointments/?subdomain=xxx
 */
export const createPublicAppointment = async (appointmentData: AppointmentCreatePayload): Promise<any> => {
     try {
        const subdomain = getSubdomainFromHostname();
        const apiUrl = buildApiUrl("/appointments/");
        const response = await axios.post(apiUrl, appointmentData, {
            params: { subdomain }
        });
        return response.data;
     } catch(error) {
        throw error;
     }
};

export const fetchAvailability = async (
    date: string, // YYYY-MM-DD format
    serviceIds: number[],
    tenantSubdomain?: string
): Promise<AvailabilityResponse> => {
    const serviceIdsString = serviceIds.join(',');
    const subdomain = tenantSubdomain || getSubdomainFromHostname();
    const apiUrl = buildApiUrl("/availability/");

    const response = await axiosInstance.get<AvailabilityResponse>(apiUrl, {
        params: {
            date_query: date,
            service_ids_query: serviceIdsString,
            subdomain,
        }
    });
    return response.data;
};
