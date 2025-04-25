// src/api/publicApi.ts
// --- FULL REPLACEMENT ---

import axios from "axios";

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
        const apiUrl = `http://${currentHostname}:8000/services/tenant`; // Target backend port & path
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
