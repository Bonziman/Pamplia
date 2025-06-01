// src/api/publicApi.ts
// --- FULL REPLACEMENT ---

import axios from "axios";
import { AvailabilityResponse } from '../types/Availability';
import axiosInstance from "./axiosInstance";

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

// --- API Functions ---

/**
 * Fetches services for the tenant identified by the current hostname's subdomain.
 * Calls the backend endpoint: GET /services/tenant
 */
export const fetchTenantServices = async (): Promise<PublicService[]> => {
    try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/services/tenant/`; // Target backend port & path
        console.log("Fetching services from:", apiUrl);
        const response = await axios.get<PublicService[]>(apiUrl);
        return response.data;
    } catch (error) {
        console.error(`Error fetching tenant services:`, error);
        if (axios.isAxiosError(error) && error.response) {
             console.error("API Error Status:", error.response.status);
             console.error("API Error Data:", error.response.data);
        }
        return []; // Return empty array on error
    }
};


/**
 * Creates a new public appointment.
 * Calls the backend endpoint: POST /appointments/
 */
export const createPublicAppointment = async (appointmentData: AppointmentCreatePayload): Promise<any> => {
     try {
        const currentHostname = window.location.hostname;
        const apiUrl = `http://${currentHostname}:8000/appointments/`; // Target backend port & path
        console.log("Submitting appointment to:", apiUrl, appointmentData);
        const response = await axios.post(apiUrl, appointmentData);
        return response.data;
     } catch(error) {
        console.error("Error creating appointment:", error);
        if (axios.isAxiosError(error) && error.response) {
             console.error("API Error Status:", error.response.status);
             console.error("API Error Data:", error.response.data);
        }
        throw error;
     }
};

export const fetchAvailability = async (
    date: string, // YYYY-MM-DD format
    serviceIds: number[],
    tenantSubdomain: string // Needed if your API endpoint isn't on the same subdomain as the main app API calls
                           // OR if the backend determines tenant from host header, this might not be needed here.
                           // Based on our backend design for /availability, it uses request.Host,
                           // so tenantSubdomain is NOT strictly needed as a parameter to the API itself,
                           // but your axiosInstance might need its baseURL adjusted if the public booking page
                           // is on a different domain/subdomain than where tenant-specific data is fetched.

                           // For now, let's assume axiosInstance is configured to hit the correct base API URL,
                           // and the subdomain is part of the window.location.hostname when this is called from
                           // a tenant's public booking page.
): Promise<AvailabilityResponse> => {
    const serviceIdsString = serviceIds.join(',');

    // The backend /availability endpoint determines the tenant from the Host header.
    // So, ensure this call is made to the correct tenant-specific URL
    // e.g., http://yourtenant.localtest.me:8000/availability
    // Your axiosInstance should be configured to handle this base URL.
    // If axiosInstance is global and always points to a generic API entry,
    // and your /availability endpoint is nested under a tenant-specific path
    // on the backend (e.g. /api/public/{tenantSubdomain}/availability), you'd adjust the URL here.
    // But our backend /availability is at /availability and gets tenant from Host.

    const currentHostname = window.location.hostname; // This will be like "yourtenant.localtest.me"
    const apiUrl = `http://${currentHostname}:8000/availability`; // Assuming backend is on port 8000

    console.log(`Fetching availability from: ${apiUrl} with params: date=${date}, service_ids=${serviceIdsString}`);

    const response = await axiosInstance.get<AvailabilityResponse>(apiUrl, {
        params: {
            date_query: date, // Match backend query param name "date_query"
            service_ids_query: serviceIdsString, // Match backend query param name "service_ids_query"
        }
    });
    return response.data;
};
